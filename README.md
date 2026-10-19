# ChronosMatch:Zero-Copy-High-Frequency-Trading-Engine
A financial Limit Order Book (LOB) matching engine built in Python and Cython. The engine bypasses Python’s Garbage Collector pauses and IPC serialization overhead through memory-mapped (mmap) circular ring buffers, cache-line aligned C-structs, and lock-free atomic sequence cursors.
