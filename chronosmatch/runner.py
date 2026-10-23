#!/usr/bin/env python3
"""
ChronosMatch: Main Engine Daemon & IPC Runner
Coordinates:
- Memory-Mapped Order Ring Buffer
- Matching Engine (Price-Time Priority Limit Order Book)
- Market Firehose (Simulated order flow at 1,000 - 100,000+ orders/sec)
- Asynchronous SQLite Audit Ledger
- Interactive command receiver via stdin (JSON-RPC)
- Real-time telemetry streaming to stdout
"""

import sys
import os
import time
import json
import threading
import tempfile
from typing import List, Tuple, cast

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chronosmatch.chronos_types import (
    SIDE_BUY, SIDE_SELL, ORDER_LIMIT, ORDER_MARKET,
    FLAG_NORMAL, FLAG_WHALE,
    ORDER_SIZE, TRADE_SIZE
)
from chronosmatch.chronos_ring_buffer import MMapRingBuffer
from chronosmatch.engine_pure import PureLimitOrderBook
from chronosmatch.market_firehose import MarketFirehose
from chronosmatch.trade_audit_ledger import TradeAuditLedger

TradeTuple = Tuple[int, int, int, int, int, int, int, int]


class ChronosMatchRunner:
    def __init__(self, target_rate: int = 15000, symbol: str = "NVDA"):
        if target_rate < 1:
            raise ValueError("target_rate must be greater than zero")
        if not symbol.strip():
            raise ValueError("symbol must not be empty")

        runtime_dir = os.environ.get("CHRONOS_RUNTIME_DIR")
        if not runtime_dir:
            runtime_dir = tempfile.mkdtemp(prefix="chronosmatch-")
        os.makedirs(runtime_dir, exist_ok=True)
        self.shm_order_path = os.path.join(runtime_dir, "chronos_orders.mmap")
        self.shm_trade_path = os.path.join(runtime_dir, "chronos_trades.mmap")
        self.db_path = os.path.join(runtime_dir, "chronos_trades_audit.db")
        self._stop_lock = threading.Lock()
        self._resources_closed = False

        # Remove stale mmap files if any to ensure clean reallocation
        for shm_file in [self.shm_order_path, self.shm_trade_path]:
            try:
                if os.path.exists(shm_file):
                    os.remove(shm_file)
            except Exception:
                pass

        # Allocate ring buffers with correct item sizes
        self.order_buffer = MMapRingBuffer(self.shm_order_path, capacity=131072, item_size=ORDER_SIZE, create=True)
        self.trade_buffer = MMapRingBuffer(self.shm_trade_path, capacity=131072, item_size=TRADE_SIZE, create=True)

        self.engine = PureLimitOrderBook()
        self.firehose = MarketFirehose(self.order_buffer, symbol=symbol, base_price=182.50)
        self.ledger = TradeAuditLedger(db_path=self.db_path, trade_buffer=self.trade_buffer)

        self.target_rate = target_rate
        self.is_running = False
        self.symbol = symbol
        self.orders_ingested = 0
        self.orders_matched = 0
        self.recent_trades_stream = []
        self.recent_whale_alerts = []

        # Preseed initial book with 300 orders
        for _ in range(300):
            o = self.firehose.generate_single_order()
            self.firehose.write_single_order(o)

    def _producer_worker(self):
        """Worker thread pushing orders into mmap buffer at configured target_rate."""
        batch_size = max(10, self.target_rate // 100) # 100 iterations per sec
        sleep_interval = 1.0 / 100.0

        while self.is_running:
            t0 = time.perf_counter()
            for _ in range(batch_size):
                if not self.is_running:
                    break
                # Whale chance: 0.05%
                is_whale = (time.time() % 9 < 0.04)
                order = self.firehose.generate_single_order(force_whale=is_whale)
                if self.firehose.write_single_order(order):
                    self.orders_ingested += 1
                else:
                    break # Backpressure

            elapsed = time.perf_counter() - t0
            to_sleep = max(0.0001, sleep_interval - elapsed)
            time.sleep(to_sleep)

    def _consumer_matching_worker(self):
        """Worker thread matching orders from mmap buffer with sub-50µs execution."""
        batch_size = 256
        trades_to_persist: List[TradeTuple] = []
        last_flush = time.time()

        try:
            while self.is_running:
                batch = self.order_buffer.read_orders_batch(batch_size)
                if not batch:
                    time.sleep(0.001)
                    continue

                for raw_ord in batch:
                    matched_trades = cast(List[TradeTuple], self.engine.process_order(raw_ord))
                    self.orders_matched += 1

                    for t in matched_trades:
                        # t format: (trade_id, maker_id, taker_id, timestamp_ns, latency_ns, price_cents, qty, flags)
                        self.trade_buffer.write_trade_raw(
                            trade_id=t[0],
                            maker_id=t[1],
                            taker_id=t[2],
                            timestamp_ns=t[3],
                            latency_ns=t[4],
                            price_cents=t[5],
                            quantity=t[6],
                            flags=t[7] if len(t) > 7 else 0
                        )
                        trades_to_persist.append(t)

                        trade_dict = {
                            "trade_id": t[0],
                            "maker_id": t[1],
                            "taker_id": t[2],
                            "timestamp_ns": t[3],
                            "latency_us": round(t[4] / 1000.0, 2),
                            "price": round(t[5] / 100.0, 2),
                            "quantity": t[6],
                            "flags": t[7] if len(t) > 7 else 0,
                            "is_whale": bool((t[7] if len(t) > 7 else 0) & 1 or t[6] >= 5000)
                        }
                        self.recent_trades_stream.append(trade_dict)
                        if len(self.recent_trades_stream) > 50:
                            self.recent_trades_stream.pop(0)

                        if trade_dict["is_whale"]:
                            whale_alert = {
                                "type": "WHALE_SWEEP",
                                "trade_id": t[0],
                                "price": round(t[5] / 100.0, 2),
                                "quantity": t[6],
                                "latency_us": round(t[4] / 1000.0, 2),
                                "time": time.strftime("%H:%M:%S")
                            }
                            self.recent_whale_alerts.append(whale_alert)
                            if len(self.recent_whale_alerts) > 20:
                                self.recent_whale_alerts.pop(0)

                # Flush to SQLite ledger asynchronously
                now = time.time()
                if len(trades_to_persist) >= 200 or (now - last_flush > 0.5 and trades_to_persist):
                    self.ledger.persist_batch(trades_to_persist)
                    trades_to_persist = []
                    last_flush = now
        finally:
            if trades_to_persist:
                self.ledger.persist_batch(trades_to_persist)

    def _telemetry_emitter(self):
        """Emits telemetry JSON snapshot to stdout every 100ms."""
        last_t = time.time()
        last_ingested = 0
        last_matched = 0

        while self.is_running:
            time.sleep(0.1)
            now = time.time()
            dt = max(0.01, now - last_t)
            
            in_tps = (self.orders_ingested - last_ingested) / dt
            match_tps = (self.orders_matched - last_matched) / dt
            last_t = now
            last_ingested = self.orders_ingested
            last_matched = self.orders_matched

            depth = self.engine.get_l2_depth(depth=10)
            buf_stats = self.order_buffer.get_stats()

            snapshot = {
                "type": "TELEMETRY",
                "timestamp": now,
                "symbol": self.symbol,
                "target_rate": self.target_rate,
                "ingest_tps": round(in_tps),
                "match_tps": round(match_tps),
                "total_ingested": self.orders_ingested,
                "total_matched": self.orders_matched,
                "total_volume": depth["total_volume"],
                "spread": depth["spread"],
                "bids": depth["bids"],
                "asks": depth["asks"],
                "avg_latency_us": depth["avg_latency_us"],
                "min_latency_us": depth["min_latency_us"],
                "max_latency_us": depth["max_latency_us"],
                "p50_us": depth["p50_us"],
                "p90_us": depth["p90_us"],
                "p99_us": depth["p99_us"],
                "p99_9_us": depth["p99_9_us"],
                "buffer": buf_stats,
                "recent_trades": self.recent_trades_stream[-15:],
                "whale_alerts": self.recent_whale_alerts[-5:],
                "burst_mode": self.firehose.burst_mode
            }
            # Output line
            print("CHRONOS_JSON:" + json.dumps(snapshot), flush=True)

    def inject_order(self, price_cents: int, quantity: int, side: int, order_type: int = ORDER_LIMIT, flags: int = FLAG_NORMAL):
        """Inject manual or institutional order into mmap ring buffer."""
        if price_cents < 0:
            raise ValueError("price_cents must not be negative")
        if quantity < 1:
            raise ValueError("quantity must be greater than zero")
        if side not in (SIDE_BUY, SIDE_SELL):
            raise ValueError("side must be SIDE_BUY or SIDE_SELL")
        if order_type not in (ORDER_LIMIT, ORDER_MARKET):
            raise ValueError("unsupported order type")

        order_id = self.firehose.order_counter + 1
        ts = time.perf_counter_ns()
        written = self.order_buffer.write_order_raw(
            order_id=order_id,
            timestamp_ns=ts,
            price_cents=price_cents,
            quantity=quantity,
            side=side,
            order_type=order_type,
            flags=flags
        )
        if not written:
            return {"status": "rejected", "reason": "order buffer is full"}

        self.firehose.order_counter = order_id
        self.orders_ingested += 1
        return {"status": "accepted", "order_id": order_id, "timestamp_ns": ts}

    def start(self):
        if self.is_running:
            return
        if self._resources_closed:
            raise RuntimeError("Cannot start a stopped runner")
        self.is_running = True
        self.t_prod = threading.Thread(target=self._producer_worker, daemon=True)
        self.t_cons = threading.Thread(target=self._consumer_matching_worker, daemon=True)
        self.t_tele = threading.Thread(target=self._telemetry_emitter, daemon=True)
        self.t_prod.start()
        self.t_cons.start()
        self.t_tele.start()

    def stop(self):
        with self._stop_lock:
            if self._resources_closed:
                return
            was_running = self.is_running
            self.is_running = False
            self._resources_closed = True

        current_thread = threading.current_thread()
        if was_running:
            for thread in (getattr(self, "t_prod", None), getattr(self, "t_cons", None), getattr(self, "t_tele", None)):
                if thread and thread is not current_thread:
                    thread.join(timeout=2.0)

        self.order_buffer.close()
        self.trade_buffer.close()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="ChronosMatch Engine Runner")
    parser.add_argument("--rate", type=int, default=25000, help="Target orders/second")
    parser.add_argument("--symbol", type=str, default="NVDA", help="Trading ticker symbol")
    args = parser.parse_args()

    runner = ChronosMatchRunner(target_rate=args.rate, symbol=args.symbol)
    runner.start()
    print(f"[CHRONOS] Engine initialized. Ring buffers mapped. Listening on stdin for control commands.", flush=True)

    try:
        while runner.is_running:
            # Check stdin without blocking forever
            line = sys.stdin.readline()
            if not line:
                runner.stop()
                break
            line = line.strip()
            if not line:
                continue

            try:
                cmd = json.loads(line)
                action = cmd.get("action")
                if action == "inject":
                    price_cents = int(float(cmd.get("price", 182.50)) * 100)
                    qty = int(cmd.get("quantity", 1000))
                    side = 0 if cmd.get("side", "BUY").upper() == "BUY" else 1
                    is_market = cmd.get("order_type", "LIMIT").upper() == "MARKET"
                    is_whale = bool(cmd.get("is_whale", False) or qty >= 5000)
                    res = runner.inject_order(
                        price_cents=price_cents,
                        quantity=qty,
                        side=side,
                        order_type=1 if is_market else 0,
                        flags=FLAG_WHALE if is_whale else FLAG_NORMAL
                    )
                    print("CHRONOS_RESP:" + json.dumps({"status": "ok", "action": "inject", "data": res}), flush=True)
                elif action == "set_rate":
                    new_rate = int(cmd.get("rate", 25000))
                    runner.target_rate = new_rate
                    runner.firehose.target_rate = new_rate
                    print("CHRONOS_RESP:" + json.dumps({"status": "ok", "action": "set_rate", "rate": new_rate}), flush=True)
                elif action == "toggle_burst":
                    runner.firehose.burst_mode = not runner.firehose.burst_mode
                    print("CHRONOS_RESP:" + json.dumps({"status": "ok", "action": "toggle_burst", "burst": runner.firehose.burst_mode}), flush=True)
                elif action == "stop":
                    runner.stop()
                    break
            except Exception as e:
                print("CHRONOS_RESP:" + json.dumps({"status": "error", "error": str(e)}), flush=True)

    except KeyboardInterrupt:
        runner.stop()

if __name__ == "__main__":
    main()
