"""
ChronosMatch: Asynchronous Trade Audit Ledger
Persists matched trades from the output ring buffer into a high-performance SQLite database.
Uses Write-Ahead Logging (WAL) and batch commits to guarantee zero latency penalty
on the critical matching path while providing an immutable regulatory audit trail.
"""

import sqlite3
import time
import os
from typing import List, Tuple
from chronosmatch.chronos_ring_buffer import MMapRingBuffer

class TradeAuditLedger:
    def __init__(self, db_path: str = "/chronosmatch/trades_audit.db", trade_buffer: MMapRingBuffer = None):
        self.db_path = db_path
        self.trade_buffer = trade_buffer
        self.is_running = False
        self.total_persisted = 0
        self._init_db()

    def _init_db(self):
        parent = os.path.dirname(self.db_path)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, exist_ok=True)
            
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # High-performance pragma settings for low-overhead audit logging
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute("PRAGMA cache_size = 10000;")
        cursor.execute("PRAGMA temp_store = MEMORY;")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                trade_id INTEGER PRIMARY KEY,
                maker_order_id INTEGER NOT NULL,
                taker_order_id INTEGER NOT NULL,
                timestamp_ns INTEGER NOT NULL,
                latency_ns INTEGER NOT NULL,
                price_cents INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                flags INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades(timestamp_ns);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trades_price ON trades(price_cents);")
        conn.commit()
        conn.close()

    def persist_batch(self, trades: List[Tuple]) -> int:
        if not trades:
            return 0
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # trade tuple format: (trade_id, maker_id, taker_id, timestamp_ns, latency_ns, price_cents, quantity, flags, ...)
        insert_rows = []
        for t in trades:
            insert_rows.append((
                t[0], # trade_id
                t[1], # maker_order_id
                t[2], # taker_order_id
                t[3], # timestamp_ns
                t[4], # latency_ns
                t[5], # price_cents
                t[6], # quantity
                t[7] if len(t) > 7 else 0  # flags
            ))

        cursor.executemany("""
            INSERT OR IGNORE INTO trades (
                trade_id, maker_order_id, taker_order_id, timestamp_ns, latency_ns, price_cents, quantity, flags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, insert_rows)
        
        conn.commit()
        count = len(insert_rows)
        self.total_persisted += count
        conn.close()
        return count

    def get_recent_trades(self, limit: int = 50) -> List[dict]:
        """Fetch the most recent persisted trades for the UI."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT trade_id, maker_order_id, taker_order_id, timestamp_ns, latency_ns, price_cents, quantity, flags, created_at
            FROM trades ORDER BY trade_id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        trades = []
        for r in rows:
            trades.append({
                "trade_id": r["trade_id"],
                "maker_order_id": r["maker_order_id"],
                "taker_order_id": r["taker_order_id"],
                "timestamp_ns": r["timestamp_ns"],
                "latency_us": round(r["latency_ns"] / 1000.0, 2),
                "price": round(r["price_cents"] / 100.0, 2),
                "quantity": r["quantity"],
                "is_whale": bool(r["flags"] & 1),
                "created_at": r["created_at"]
            })
        conn.close()
        return trades

    def get_audit_summary(self) -> dict:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT count(*), coalesce(sum(quantity), 0), coalesce(avg(latency_ns), 0), coalesce(max(latency_ns), 0) FROM trades")
        count, volume, avg_lat_ns, max_lat_ns = cursor.fetchone()
        conn.close()
        return {
            "total_trades": count,
            "total_volume": volume,
            "avg_latency_us": round(avg_lat_ns / 1000.0, 2),
            "max_latency_us": round(max_lat_ns / 1000.0, 2),
            "db_path": self.db_path
        }
