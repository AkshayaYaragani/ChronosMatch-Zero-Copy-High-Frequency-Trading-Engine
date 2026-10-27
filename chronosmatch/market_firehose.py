"""
ChronosMatch: High-Throughput Market Order Firehose (asyncio)
Simulates Nasdaq/NYSE order flow blasting up to 100,000+ orders/second
directly into the zero-copy mmap ring buffer.
"""

import asyncio
import time
import random
import os
from typing import Optional
from chronosmatch.chronos_types import (
    SIDE_BUY, SIDE_SELL, ORDER_LIMIT, ORDER_MARKET,
    FLAG_NORMAL, FLAG_WHALE, FLAG_EARNINGS_BURST
)
from chronosmatch.chronos_ring_buffer import MMapRingBuffer

class MarketFirehose:
    def __init__(self, ring_buffer: MMapRingBuffer, symbol: str = "NVDA", base_price: float = 182.50):
        self.ring_buffer = ring_buffer
        self.symbol = symbol
        self.current_price_cents = int(base_price * 100)
        self.order_counter = 1
        self.is_running = False
        self.total_generated = 0
        self.target_rate = 20000  # orders / sec default
        self.burst_mode = False

    def generate_single_order(self, force_whale: bool = False, force_burst: bool = False) -> tuple:
        """Generates order parameters based on realistic market microstructure."""
        self.order_counter += 1
        order_id = self.order_counter
        timestamp_ns = time.perf_counter_ns()

        # Random walk for mid price
        if random.random() < 0.08:
            self.current_price_cents += random.choice([-1, 1])

        if force_whale:
            # Massive whale order: 5,000 - 35,000 shares crossing the book
            side = random.choice([SIDE_BUY, SIDE_SELL])
            order_type = ORDER_MARKET if random.random() < 0.7 else ORDER_LIMIT
            qty = random.randint(5000, 35000)
            # Limit price set deep into the opposite side to sweep multiple levels
            if side == SIDE_BUY:
                price = self.current_price_cents + random.randint(15, 60)
            else:
                price = max(100, self.current_price_cents - random.randint(15, 60))
            flags = FLAG_WHALE
            return (order_id, timestamp_ns, price, qty, side, order_type, flags)

        if force_burst or self.burst_mode:
            # Earnings shock wave: high volatility, rapid market orders
            side = random.choice([SIDE_BUY, SIDE_SELL])
            order_type = ORDER_MARKET if random.random() < 0.65 else ORDER_LIMIT
            offset = random.randint(-40, 40)
            price = max(100, self.current_price_cents + offset)
            qty = random.choice([100, 200, 500, 1000, 2500])
            flags = FLAG_EARNINGS_BURST
            return (order_id, timestamp_ns, price, qty, side, order_type, flags)

        # Standard market flow: 80% limit liquidity, 20% crossing market orders
        is_market = random.random() < 0.22
        side = random.choice([SIDE_BUY, SIDE_SELL])
        
        if is_market:
            order_type = ORDER_MARKET
            price = self.current_price_cents
            qty = random.choice([50, 100, 200, 300, 500])
        else:
            order_type = ORDER_LIMIT
            # Spread around current price
            spread_offset = random.randint(1, 12)
            if side == SIDE_BUY:
                price = max(100, self.current_price_cents - spread_offset)
            else:
                price = self.current_price_cents + spread_offset
            qty = random.choice([100, 200, 400, 800, 1200, 2000])

        flags = FLAG_NORMAL
        return (order_id, timestamp_ns, price, qty, side, order_type, flags)

    def write_single_order(self, order_tuple: tuple) -> bool:
        """Writes order directly to ring buffer without copy."""
        return self.ring_buffer.write_order_raw(
            order_id=order_tuple[0],
            timestamp_ns=order_tuple[1],
            price_cents=order_tuple[2],
            quantity=order_tuple[3],
            side=order_tuple[4],
            order_type=order_tuple[5],
            flags=order_tuple[6]
        )

    async def run_firehose(self, duration_sec: Optional[float] = None, target_rate: int = 50000):
        """
        Runs the async firehose. Uses micro-batching to saturate IPC bus at 50,000 - 100,000+ orders/sec.
        """
        self.is_running = True
        self.target_rate = target_rate
        start_time = time.time()
        batch_size = max(50, target_rate // 200) # 200 iterations per second
        sleep_interval = 1.0 / 200.0

        print(f"[FIREHOSE] Started firehose at target rate: {target_rate:,} orders/sec (batch size: {batch_size})")

        while self.is_running:
            iter_start = time.perf_counter()
            
            # Write batch of orders directly into mmap ring buffer
            for _ in range(batch_size):
                # Occasional whale (1 in 5000)
                is_whale = (random.random() < 0.0003)
                order = self.generate_single_order(force_whale=is_whale)
                if self.write_single_order(order):
                    self.total_generated += 1
                else:
                    # Buffer backpressure
                    break

            if duration_sec and (time.time() - start_time) >= duration_sec:
                break

            elapsed = time.perf_counter() - iter_start
            sleep_time = max(0.0, sleep_interval - elapsed)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
            else:
                await asyncio.sleep(0) # Yield event loop

        print(f"[FIREHOSE] Completed. Total orders pumped: {self.total_generated:,}")

    def stop(self):
        self.is_running = False
