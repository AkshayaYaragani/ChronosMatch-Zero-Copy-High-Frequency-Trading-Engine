"""
ChronosMatch: Zero-Copy High-Frequency Trading Engine
Memory-Mapped Lock-Free Ring Buffer for Inter-Process Communication (IPC).
Allows producer (market ingestion) and consumer (matching engine) to share raw
binary structs in RAM without serialization (JSON/Pickle) and without Python GC overhead.
"""

import os
import mmap
import struct
import time
from typing import Any, Optional, Tuple, List
from chronosmatch.chronos_types import (
    HEADER_FORMAT, HEADER_SIZE,
    ORDER_FORMAT, ORDER_SIZE,
    TRADE_FORMAT, TRADE_SIZE
)

class MMapRingBuffer:
    """
    Lock-free circular ring buffer backed by an mmap region.
    Header occupies 64 bytes (1 CPU cache line).
    Data slot offsets are calculated as: HEADER_SIZE + (index % capacity) * item_size.
    """
    def __init__(self, filepath: str, capacity: int = 131072, item_size: int = ORDER_SIZE, create: bool = False):
        self.filepath = filepath
        self.capacity = capacity
        self.item_size = item_size
        self.total_size = HEADER_SIZE + (self.capacity * self.item_size)
        
        # Ensure parent dir exists
        parent_dir = os.path.dirname(filepath)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)
            
        if create:
            # Allocate file to required size using seek and ftruncate
            with open(self.filepath, "wb") as f:
                f.seek(self.total_size - 1)
                f.write(b'\x00')
            self._file = open(self.filepath, "r+b")
            try:
                os.ftruncate(self._file.fileno(), self.total_size)
            except Exception:
                pass
            self._mmap = mmap.mmap(self._file.fileno(), self.total_size, access=mmap.ACCESS_WRITE)
            # Initialize header: capacity, item_size, write_idx=0, read_idx=0, dropped=0, pad
            struct.pack_into(HEADER_FORMAT, self._mmap, 0, self.capacity, self.item_size, 0, 0, 0, b'\x00'*24)
            self._mmap.flush()
        else:
            if not os.path.exists(self.filepath):
                raise FileNotFoundError(f"Buffer file {self.filepath} does not exist.")
            self._file = open(self.filepath, "r+b")
            self._mmap = mmap.mmap(self._file.fileno(), 0, access=mmap.ACCESS_WRITE)
            # Read header
            cap, isize, _, _, _, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
            self.capacity = cap
            self.item_size = isize
            self.total_size = HEADER_SIZE + (self.capacity * self.item_size)

        self.mv = memoryview(self._mmap)

    def write_order_raw(self, order_id: int, timestamp_ns: int, price_cents: int, quantity: int, side: int, order_type: int = 0, flags: int = 0) -> bool:
        """
        Directly writes an order struct into the next circular slot.
        Zero-copy serialization via struct.pack_into.
        """
        # Read atomic cursors
        cap, isize, write_idx, read_idx, dropped, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
        
        # Check if full
        if (write_idx - read_idx) >= cap:
            # Overwrite or drop; in low-latency systems we record drop count
            struct.pack_into('<Q', self._mmap, 32, dropped + 1)
            return False

        slot_offset = HEADER_SIZE + ((write_idx % cap) * isize)
        if slot_offset + ORDER_SIZE > len(self._mmap) or isize < ORDER_SIZE:
            struct.pack_into('<Q', self._mmap, 32, dropped + 1)
            return False

        struct.pack_into(
            ORDER_FORMAT,
            self._mmap,
            slot_offset,
            order_id,
            timestamp_ns,
            price_cents,
            quantity,
            side,
            order_type,
            flags,
            b'\x00'*5
        )
        # Advance write cursor
        struct.pack_into('<Q', self._mmap, 16, write_idx + 1)
        return True

    def read_order_raw(self) -> Optional[Tuple[Any, ...]]:
        """
        Reads the next order struct from the ring buffer.
        Zero-copy unpack directly from memory-mapped address.
        """
        cap, isize, write_idx, read_idx, _, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
        if read_idx >= write_idx:
            return None # Buffer empty

        slot_offset = HEADER_SIZE + ((read_idx % cap) * isize)
        if slot_offset + ORDER_SIZE > len(self._mmap):
            return None
        order_tuple = struct.unpack_from(ORDER_FORMAT, self._mmap, slot_offset)
        
        # Advance read cursor
        struct.pack_into('<Q', self._mmap, 24, read_idx + 1)
        return order_tuple

    def read_orders_batch(self, max_batch: int = 256) -> List[Tuple[Any, ...]]:
        """
        Batch-drain orders for ultra-high throughput processing.
        Minimizes header unpack overhead.
        """
        cap, isize, write_idx, read_idx, _, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
        available = write_idx - read_idx
        if available <= 0:
            return []
        
        count = min(available, max_batch)
        results = []
        for i in range(count):
            slot_offset = HEADER_SIZE + (((read_idx + i) % cap) * isize)
            if slot_offset + ORDER_SIZE <= len(self._mmap):
                results.append(struct.unpack_from(ORDER_FORMAT, self._mmap, slot_offset))
            
        struct.pack_into('<Q', self._mmap, 24, read_idx + count)
        return results

    def write_trade_raw(self, trade_id: int, maker_id: int, taker_id: int, timestamp_ns: int, latency_ns: int, price_cents: int, quantity: int, flags: int = 0) -> bool:
        """
        Writes a trade match struct into trade ring buffer.
        """
        cap, isize, write_idx, read_idx, dropped, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
        if (write_idx - read_idx) >= cap:
            struct.pack_into('<Q', self._mmap, 32, dropped + 1)
            return False

        slot_offset = HEADER_SIZE + ((write_idx % cap) * isize)
        if slot_offset + TRADE_SIZE > len(self._mmap) or isize < TRADE_SIZE:
            struct.pack_into('<Q', self._mmap, 32, dropped + 1)
            return False

        struct.pack_into(
            TRADE_FORMAT,
            self._mmap,
            slot_offset,
            trade_id,
            maker_id,
            taker_id,
            timestamp_ns,
            latency_ns,
            price_cents,
            quantity,
            flags,
            b'\x00'*15
        )
        struct.pack_into('<Q', self._mmap, 16, write_idx + 1)
        return True

    def read_trades_batch(self, max_batch: int = 256) -> List[Tuple[Any, ...]]:
        """
        Batch-drain trades from trade ring buffer.
        """
        cap, isize, write_idx, read_idx, _, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
        available = write_idx - read_idx
        if available <= 0:
            return []
            
        count = min(available, max_batch)
        results = []
        for i in range(count):
            slot_offset = HEADER_SIZE + (((read_idx + i) % cap) * isize)
            results.append(struct.unpack_from(TRADE_FORMAT, self._mmap, slot_offset))
            
        struct.pack_into('<Q', self._mmap, 24, read_idx + count)
        return results

    def get_stats(self) -> dict:
        """Return real-time buffer occupancy and cursor positions."""
        cap, isize, write_idx, read_idx, dropped, _ = struct.unpack_from(HEADER_FORMAT, self._mmap, 0)
        return {
            "capacity": cap,
            "item_size": isize,
            "write_index": write_idx,
            "read_index": read_idx,
            "queued": max(0, write_idx - read_idx),
            "dropped": dropped,
            "utilization_pct": round((max(0, write_idx - read_idx) / cap) * 100, 2)
        }

    def close(self):
        try:
            if hasattr(self, "mv"):
                self.mv.release()
            self._mmap.close()
            self._file.close()
        except Exception:
            pass
