"""
ChronosMatch: Zero-Copy High-Frequency Trading Engine
Binary C-Struct definitions and constants for zero-copy memory mapping.
"""

import struct
from ctypes import Structure, c_uint64, c_uint32, c_uint8, c_char

# Side definitions
SIDE_BUY = 0
SIDE_SELL = 1

# Order Type definitions
ORDER_LIMIT = 0
ORDER_MARKET = 1
ORDER_CANCEL = 2

# Flags
FLAG_NORMAL = 0
FLAG_WHALE = 1
FLAG_EARNINGS_BURST = 2

# Binary formats (Little-Endian, Cache-friendly packed)
# Order: uint64 order_id, uint64 timestamp_ns, uint32 price_cents, uint32 quantity, uint8 side, uint8 order_type, uint8 flags, uint8 pad[5]
# Total size: 8 + 8 + 4 + 4 + 1 + 1 + 1 + 5 = 32 bytes (aligned to half cache line)
ORDER_FORMAT = '<QQIIBBB5s'
ORDER_SIZE = struct.calcsize(ORDER_FORMAT)
assert ORDER_SIZE == 32, f"Expected 32 bytes, got {ORDER_SIZE}"

# Trade Match: uint64 trade_id, uint64 maker_id, uint64 taker_id, uint64 timestamp_ns, uint64 latency_ns, uint32 price_cents, uint32 quantity, uint8 flags, uint8 pad[15]
# Total size: 8 + 8 + 8 + 8 + 8 + 4 + 4 + 1 + 15 = 64 bytes (aligned to 1 full CPU cache line)
TRADE_FORMAT = '<QQQQQIIB15s'
TRADE_SIZE = struct.calcsize(TRADE_FORMAT)
assert TRADE_SIZE == 64, f"Expected 64 bytes, got {TRADE_SIZE}"

# Header format for Ring Buffer:
# uint64 capacity, uint64 item_size, uint64 write_idx (atomic write cursor), uint64 read_idx (atomic read cursor), uint64 dropped_count, uint8 pad[24]
# Total size: 64 bytes (1 full CPU Cache Line)
HEADER_FORMAT = '<QQQQQ24s'
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)
assert HEADER_SIZE == 64, f"Expected 64 bytes, got {HEADER_SIZE}"

class OrderCStruct(Structure):
    _pack_ = 1
    _fields_ = [
        ("order_id", c_uint64),
        ("timestamp_ns", c_uint64),
        ("price_cents", c_uint32),
        ("quantity", c_uint32),
        ("side", c_uint8),
        ("order_type", c_uint8),
        ("flags", c_uint8),
        ("_pad", c_char * 5),
    ]

class TradeCStruct(Structure):
    _pack_ = 1
    _fields_ = [
        ("trade_id", c_uint64),
        ("maker_order_id", c_uint64),
        ("taker_order_id", c_uint64),
        ("timestamp_ns", c_uint64),
        ("latency_ns", c_uint64),
        ("price_cents", c_uint32),
        ("quantity", c_uint32),
        ("flags", c_uint8),
        ("_pad", c_char * 15),
    ]
