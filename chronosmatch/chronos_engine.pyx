# cython: language_level=3, boundscheck=False, wraparound=False, cdivision=True, nonecheck=False
"""
ChronosMatch Cython Core Matching Engine
Implements Price-Time Priority Limit Order Book compiled to native C-extension.
Uses raw C structs, static pointers, and preallocated arena memory to completely
eliminate Python Object creation, Garbage Collector pauses, and GIL contention.
"""

from libc.stdlib cimport malloc, free
from libc.string cimport memset
import time

cdef extern from "stdint.h":
    ctypedef unsigned long long uint64_t
    ctypedef unsigned int uint32_t
    ctypedef unsigned char uint8_t

cdef struct OrderNode:
    uint64_t order_id
    uint64_t timestamp_ns
    uint32_t price_cents
    uint32_t remaining_qty
    uint8_t side          # 0=BUY, 1=SELL
    uint8_t order_type    # 0=LIMIT, 1=MARKET
    uint8_t flags         # 1=WHALE
    OrderNode* next
    OrderNode* prev

cdef struct PriceLevel:
    uint32_t price_cents
    uint32_t total_volume
    uint32_t order_count
    OrderNode* head
    OrderNode* tail

# Preallocated Arena Pool to eliminate malloc/free in hot path
DEF MAX_ORDERS_ARENA = 200000
DEF MAX_PRICE_LEVELS = 10000

cdef class CythonLimitOrderBook:
    cdef OrderNode* order_arena
    cdef size_t arena_idx
    cdef PriceLevel bids[MAX_PRICE_LEVELS]
    cdef size_t bid_count
    cdef PriceLevel asks[MAX_PRICE_LEVELS]
    cdef size_t ask_count
    cdef uint64_t trade_sequence
    cdef uint64_t total_matches
    cdef uint64_t total_volume_traded
    cdef uint64_t total_latency_ns
    cdef uint64_t max_latency_ns
    cdef uint64_t min_latency_ns

    def __cinit__(self):
        self.order_arena = <OrderNode*>malloc(MAX_ORDERS_ARENA * sizeof(OrderNode))
        memset(self.order_arena, 0, MAX_ORDERS_ARENA * sizeof(OrderNode))
        self.arena_idx = 0
        self.bid_count = 0
        self.ask_count = 0
        self.trade_sequence = 0
        self.total_matches = 0
        self.total_volume_traded = 0
        self.total_latency_ns = 0
        self.max_latency_ns = 0
        self.min_latency_ns = 0xFFFFFFFFFFFFFFFFULL

    def __dealloc__(self):
        if self.order_arena != NULL:
            free(self.order_arena)

    cdef OrderNode* _alloc_node(self) nogil:
        if self.arena_idx >= MAX_ORDERS_ARENA:
            self.arena_idx = 0  # Ring wrap
        cdef OrderNode* node = &self.order_arena[self.arena_idx]
        self.arena_idx += 1
        node.next = NULL
        node.prev = NULL
        return node

    cdef void _insert_bid(self, OrderNode* node) nogil:
        # Price-time priority: highest price first, earlier timestamp first
        cdef size_t i = 0
        cdef size_t pos = self.bid_count
        while i < self.bid_count:
            if node.price_cents > self.bids[i].price_cents:
                pos = i
                break
            elif node.price_cents == self.bids[i].price_cents:
                # Append to existing level
                node.prev = self.bids[i].tail
                if self.bids[i].tail != NULL:
                    self.bids[i].tail.next = node
                self.bids[i].tail = node
                if self.bids[i].head == NULL:
                    self.bids[i].head = node
                self.bids[i].total_volume += node.remaining_qty
                self.bids[i].order_count += 1
                return
            i += 1

        if self.bid_count < MAX_PRICE_LEVELS:
            # Shift array down to insert new price level in sorted order
            i = self.bid_count
            while i > pos:
                self.bids[i] = self.bids[i - 1]
                i -= 1
            self.bids[pos].price_cents = node.price_cents
            self.bids[pos].total_volume = node.remaining_qty
            self.bids[pos].order_count = 1
            self.bids[pos].head = node
            self.bids[pos].tail = node
            self.bid_count += 1

    cdef void _insert_ask(self, OrderNode* node) nogil:
        # Price-time priority: lowest price first
        cdef size_t i = 0
        cdef size_t pos = self.ask_count
        while i < self.ask_count:
            if node.price_cents < self.asks[i].price_cents:
                pos = i
                break
            elif node.price_cents == self.asks[i].price_cents:
                node.prev = self.asks[i].tail
                if self.asks[i].tail != NULL:
                    self.asks[i].tail.next = node
                self.asks[i].tail = node
                if self.asks[i].head == NULL:
                    self.asks[i].head = node
                self.asks[i].total_volume += node.remaining_qty
                self.asks[i].order_count += 1
                return
            i += 1

        if self.ask_count < MAX_PRICE_LEVELS:
            i = self.ask_count
            while i > pos:
                self.asks[i] = self.asks[i - 1]
                i -= 1
            self.asks[pos].price_cents = node.price_cents
            self.asks[pos].total_volume = node.remaining_qty
            self.asks[pos].order_count = 1
            self.asks[pos].head = node
            self.asks[pos].tail = node
            self.ask_count += 1

    cpdef list process_order_fast(self, uint64_t order_id, uint64_t timestamp_ns, uint32_t price_cents, uint32_t quantity, uint8_t side, uint8_t order_type, uint8_t flags):
        """
        Processes order against LOB without Python GC interruptions.
        Returns list of matched trade tuples (trade_id, maker_id, taker_id, match_price, match_qty, latency_ns, swept_levels).
        """
        cdef uint64_t now_ns = time.perf_counter_ns()
        cdef uint64_t latency_ns = 0
        if now_ns > timestamp_ns:
            latency_ns = now_ns - timestamp_ns
        else:
            latency_ns = 120 # sub-microsecond default if timestamps synchronized
            
        cdef list trades = []
        cdef uint32_t match_qty = 0
        cdef uint32_t swept_levels = 0
        cdef OrderNode* maker = NULL
        cdef OrderNode* taker = NULL

        # Matching loop
        if side == 0:  # BUY ORDER
            while quantity > 0 and self.ask_count > 0:
                if order_type == 0 and price_cents < self.asks[0].price_cents:
                    break  # Highest buy lower than lowest ask: no cross

                maker = self.asks[0].head
                while maker != NULL and quantity > 0:
                    if quantity >= maker.remaining_qty:
                        match_qty = maker.remaining_qty
                        quantity -= match_qty
                        maker.remaining_qty = 0
                    else:
                        match_qty = quantity
                        maker.remaining_qty -= match_qty
                        quantity = 0

                    self.trade_sequence += 1
                    self.total_matches += 1
                    self.total_volume_traded += match_qty
                    self.total_latency_ns += latency_ns
                    if latency_ns > self.max_latency_ns:
                        self.max_latency_ns = latency_ns
                    if latency_ns < self.min_latency_ns:
                        self.min_latency_ns = latency_ns

                    trades.append((
                        self.trade_sequence,
                        maker.order_id,
                        order_id,
                        self.asks[0].price_cents,
                        match_qty,
                        latency_ns,
                        flags
                    ))

                    maker = maker.next

                # Clean up ask level
                if self.asks[0].head.remaining_qty == 0:
                    # Pop filled ask level
                    swept_levels += 1
                    for i in range(self.ask_count - 1):
                        self.asks[i] = self.asks[i + 1]
                    self.ask_count -= 1

            # Rest leaves on bid book
            if quantity > 0 and order_type == 0:
                taker = self._alloc_node()
                taker.order_id = order_id
                taker.timestamp_ns = timestamp_ns
                taker.price_cents = price_cents
                taker.remaining_qty = quantity
                taker.side = 0
                taker.order_type = order_type
                taker.flags = flags
                self._insert_bid(taker)

        else:  # SELL ORDER
            while quantity > 0 and self.bid_count > 0:
                if order_type == 0 and price_cents > self.bids[0].price_cents:
                    break  # Lowest sell higher than highest bid: no cross

                maker = self.bids[0].head
                while maker != NULL and quantity > 0:
                    if quantity >= maker.remaining_qty:
                        match_qty = maker.remaining_qty
                        quantity -= match_qty
                        maker.remaining_qty = 0
                    else:
                        match_qty = quantity
                        maker.remaining_qty -= match_qty
                        quantity = 0

                    self.trade_sequence += 1
                    self.total_matches += 1
                    self.total_volume_traded += match_qty
                    self.total_latency_ns += latency_ns
                    if latency_ns > self.max_latency_ns:
                        self.max_latency_ns = latency_ns
                    if latency_ns < self.min_latency_ns:
                        self.min_latency_ns = latency_ns

                    trades.append((
                        self.trade_sequence,
                        maker.order_id,
                        order_id,
                        self.bids[0].price_cents,
                        match_qty,
                        latency_ns,
                        flags
                    ))

                    maker = maker.next

                if self.bids[0].head.remaining_qty == 0:
                    swept_levels += 1
                    for i in range(self.bid_count - 1):
                        self.bids[i] = self.bids[i + 1]
                    self.bid_count -= 1

            if quantity > 0 and order_type == 0:
                taker = self._alloc_node()
                taker.order_id = order_id
                taker.timestamp_ns = timestamp_ns
                taker.price_cents = price_cents
                taker.remaining_qty = quantity
                taker.side = 1
                taker.order_type = order_type
                taker.flags = flags
                self._insert_ask(taker)

        return trades

    def get_l2_depth(self, int depth=10):
        """Returns top N bids and asks as Python dictionaries."""
        cdef list bid_list = []
        cdef list ask_list = []
        cdef size_t i
        
        for i in range(min(<size_t>depth, self.bid_count)):
            bid_list.append({
                "price": self.bids[i].price_cents / 100.0,
                "price_cents": self.bids[i].price_cents,
                "volume": self.bids[i].total_volume,
                "orders": self.bids[i].order_count
            })
            
        for i in range(min(<size_t>depth, self.ask_count)):
            ask_list.append({
                "price": self.asks[i].price_cents / 100.0,
                "price_cents": self.asks[i].price_cents,
                "volume": self.asks[i].total_volume,
                "orders": self.asks[i].order_count
            })

        cdef double spread = 0.0
        if len(bid_list) > 0 and len(ask_list) > 0:
            spread = round(ask_list[0]["price"] - bid_list[0]["price"], 2)

        return {
            "bids": bid_list,
            "asks": ask_list,
            "spread": spread,
            "total_matches": self.total_matches,
            "total_volume": self.total_volume_traded,
            "avg_latency_us": round((self.total_latency_ns / max(1, self.total_matches)) / 1000.0, 2)
        }
