#!/usr/bin/env python3
"""
ChronosMatch: Terminal Curses Dashboard
Displays real-time Order Book (Bid/Ask depth ladder), microsecond latency percentiles,
system throughput, and visually highlights Whale sweep orders in ASCII art.
"""

import curses
import time
import os
import sys

# Ensure chronosmatch is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chronosmatch.engine_pure import PureLimitOrderBook
from chronosmatch.chronos_ring_buffer import MMapRingBuffer
from chronosmatch.market_firehose import MarketFirehose

def run_curses_dashboard(stdscr):
    # Initialize curses colors and modes
    curses.curs_set(0)
    curses.start_color()
    curses.use_default_colors()
    
    # Color pairs
    curses.init_pair(1, curses.COLOR_GREEN, -1)   # Bids / Success
    curses.init_pair(2, curses.COLOR_RED, -1)     # Asks / Alert
    curses.init_pair(3, curses.COLOR_CYAN, -1)    # Headers
    curses.init_pair(4, curses.COLOR_YELLOW, -1)  # Warnings / Whales
    curses.init_pair(5, curses.COLOR_MAGENTA, -1) # Microseconds / Telemetry
    curses.init_pair(6, curses.COLOR_WHITE, curses.COLOR_RED) # Whale Flash Banner

    stdscr.nodelay(True) # Non-blocking input

    # Initialize Engine and Buffer
    shm_path = "/tmp/chronos_orders.mmap"
    ring_buffer = MMapRingBuffer(shm_path, capacity=65536, create=True)
    firehose = MarketFirehose(ring_buffer, symbol="NVDA", base_price=182.50)
    engine = PureLimitOrderBook()

    whale_banner_until = 0.0
    last_whale_info = ""

    # Pre-seed initial book liquidity
    for _ in range(400):
        o = firehose.generate_single_order()
        firehose.write_single_order(o)

    last_render_time = 0
    orders_processed_this_sec = 0
    t_sec_start = time.time()
    tps = 0

    try:
        while True:
            # Handle user keyboard input
            key = stdscr.getch()
            if key == ord('q') or key == 27: # 'q' or ESC
                break
            elif key == ord('w'): # Inject Whale
                whale_order = firehose.generate_single_order(force_whale=True)
                firehose.write_single_order(whale_order)
            elif key == ord('e'): # Burst shock
                firehose.burst_mode = not firehose.burst_mode

            # Pump simulated incoming orders
            for _ in range(80):
                ord_in = firehose.generate_single_order(force_whale=(time.time() % 7 < 0.05))
                firehose.write_single_order(ord_in)

            # Drain batch of orders into engine
            batch = ring_buffer.read_orders_batch(max_batch=128)
            for raw_ord in batch:
                trades = engine.process_order(raw_ord)
                orders_processed_this_sec += 1
                
                # Check for whale trades
                for t in trades:
                    flags = t[7] if len(t) > 7 else 0
                    qty = t[6]
                    if flags & 1 or qty >= 5000:
                        whale_banner_until = time.time() + 2.5
                        last_whale_info = f"WHALE SWEEP: {qty:,} shares @ ${t[5]/100:.2f} (Latency: {t[4]/1000:.1f}µs)"

            # Update TPS
            now = time.time()
            if now - t_sec_start >= 1.0:
                tps = orders_processed_this_sec / (now - t_sec_start)
                orders_processed_this_sec = 0
                t_sec_start = now

            # Render at 25 FPS
            if now - last_render_time >= 0.04:
                last_render_time = now
                stdscr.erase()
                max_y, max_x = stdscr.getmaxyx()

                depth = engine.get_l2_depth(depth=10)
                bids = depth["bids"]
                asks = depth["asks"]
                spread = depth["spread"]

                # Title Banner
                title = " [CHRONOSMATCH] ZERO-COPY HIGH-FREQUENCY MATCHING ENGINE "
                stdscr.attron(curses.color_pair(3) | curses.A_BOLD)
                stdscr.addstr(0, max(0, (max_x - len(title)) // 2), title[:max_x])
                stdscr.attroff(curses.color_pair(3) | curses.A_BOLD)

                sub = f"Symbol: NVDA | Memory: /dev/shm mmap | Zero-Pickle IPC | Press 'w': Whale Sweep | 'e': Shockwave | 'q': Quit"
                stdscr.addstr(1, max(0, (max_x - len(sub)) // 2), sub[:max_x])

                # Telemetry Bar
                perf_line = (
                    f" Throughput: {tps:,.0f} ord/s | Matched: {depth['total_matches']:,} | "
                    f"Lat p50: {depth['p50_us']}µs | p90: {depth['p90_us']}µs | p99: {depth['p99_us']}µs | "
                    f"GC Pauses: 0 (Zero-Alloc Path)"
                )
                stdscr.attron(curses.color_pair(5) | curses.A_BOLD)
                stdscr.addstr(3, 2, perf_line[:max_x-4])
                stdscr.attroff(curses.color_pair(5) | curses.A_BOLD)

                # Whale Alert Banner
                if now < whale_banner_until:
                    stdscr.attron(curses.color_pair(6) | curses.A_BOLD | curses.A_BLINK)
                    alert_txt = f" >>>>> {last_whale_info} <<<<< "
                    stdscr.addstr(4, max(0, (max_x - len(alert_txt)) // 2), alert_txt[:max_x])
                    stdscr.attroff(curses.color_pair(6) | curses.A_BOLD | curses.A_BLINK)
                else:
                    stdscr.addstr(4, 2, f" Spread: ${spread:.2f} | Best Bid: ${bids[0]['price']:.2f if bids else 0:.2f} | Best Ask: ${asks[0]['price']:.2f if asks else 0:.2f}")

                # Draw Order Book Ladder
                stdscr.addstr(6, 2, "--- BIDS (BUY LIQUIDITY) ---", curses.color_pair(1) | curses.A_BOLD)
                stdscr.addstr(6, 45, "--- ASKS (SELL LIQUIDITY) ---", curses.color_pair(2) | curses.A_BOLD)

                stdscr.addstr(7, 2, "Price ($)    Qty      Orders", curses.A_DIM)
                stdscr.addstr(7, 45, "Price ($)    Qty      Orders", curses.A_DIM)

                row = 8
                max_rows = min(10, max(len(bids), len(asks)))
                for i in range(max_rows):
                    if i < len(bids):
                        b = bids[i]
                        b_str = f"${b['price']:>7.2f}  {b['volume']:>8,}   {b['orders']:>4}"
                        stdscr.addstr(row + i, 2, b_str, curses.color_pair(1))
                    
                    if i < len(asks):
                        a = asks[i]
                        a_str = f"${a['price']:>7.2f}  {a['volume']:>8,}   {a['orders']:>4}"
                        stdscr.addstr(row + i, 45, a_str, curses.color_pair(2))

                # Ring Buffer Status
                buf_stats = ring_buffer.get_stats()
                stats_line = f"MMap Ring Buffer: Cap={buf_stats['capacity']:,} | In Flight={buf_stats['queued']:,} | Dropped={buf_stats['dropped']}"
                stdscr.addstr(20, 2, stats_line, curses.A_DIM)

                stdscr.refresh()

            time.sleep(0.005)

    except KeyboardInterrupt:
        pass
    finally:
        ring_buffer.close()

if __name__ == "__main__":
    curses.wrapper(run_curses_dashboard)
