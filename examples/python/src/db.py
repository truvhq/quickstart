"""SQLite database for storing orders, API logs, and webhook events."""

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path


DB_PATH = str(Path(__file__).resolve().parent.parent.parent / "quickstart.db")
_lock = threading.Lock()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist."""
    with _lock:
        conn = _get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                truv_order_id TEXT,
                demo_id TEXT,
                bridge_token TEXT,
                share_url TEXT,
                status TEXT DEFAULT 'created',
                raw_response TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS api_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT,
                method TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                request_body TEXT,
                response_body TEXT,
                status_code INTEGER,
                duration_ms REAL,
                timestamp TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (order_id) REFERENCES orders(id)
            );

            CREATE TABLE IF NOT EXISTS webhook_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT,
                webhook_id TEXT,
                event_type TEXT,
                status TEXT,
                payload TEXT,
                received_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (order_id) REFERENCES orders(id)
            );
        """)
        conn.commit()
        conn.close()


def generate_id() -> str:
    return uuid.uuid4().hex[:12]


# --- Orders ---

def create_order(order_id: str, truv_order_id: str = None, demo_id: str = None,
                 bridge_token: str = None, share_url: str = None,
                 status: str = "created", raw_response: dict = None) -> dict:
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT INTO orders (id, truv_order_id, demo_id, bridge_token, share_url, status, raw_response) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (order_id, truv_order_id, demo_id, bridge_token, share_url, status,
             json.dumps(raw_response) if raw_response else None),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        conn.close()
        return dict(row)


def get_order(order_id: str) -> dict | None:
    with _lock:
        conn = _get_conn()
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        conn.close()
        return dict(row) if row else None


def update_order(order_id: str, **kwargs):
    if not kwargs:
        return
    with _lock:
        conn = _get_conn()
        sets = []
        vals = []
        for k, v in kwargs.items():
            sets.append(f"{k} = ?")
            vals.append(json.dumps(v) if isinstance(v, dict) else v)
        vals.append(order_id)
        conn.execute(f"UPDATE orders SET {', '.join(sets)} WHERE id = ?", vals)
        conn.commit()
        conn.close()


def find_order_by_truv_id(truv_order_id: str) -> dict | None:
    with _lock:
        conn = _get_conn()
        row = conn.execute(
            "SELECT * FROM orders WHERE truv_order_id = ?", (truv_order_id,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None


# --- API Logs ---

def insert_api_log(order_id: str, method: str, endpoint: str,
                   request_body: str = None, response_body: str = None,
                   status_code: int = None, duration_ms: float = None) -> dict:
    with _lock:
        conn = _get_conn()
        cursor = conn.execute(
            "INSERT INTO api_logs (order_id, method, endpoint, request_body, response_body, status_code, duration_ms) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (order_id, method, endpoint, request_body, response_body, status_code, duration_ms),
        )
        row = conn.execute("SELECT * FROM api_logs WHERE id = ?", (cursor.lastrowid,)).fetchone()
        conn.commit()
        conn.close()
        return dict(row)


def get_api_logs(order_id: str) -> list[dict]:
    with _lock:
        conn = _get_conn()
        rows = conn.execute(
            "SELECT * FROM api_logs WHERE order_id = ? ORDER BY id ASC", (order_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]


# --- Webhook Events ---

def insert_webhook_event(order_id: str = None, webhook_id: str = None,
                         event_type: str = None, status: str = None,
                         payload: dict = None) -> dict:
    with _lock:
        conn = _get_conn()
        cursor = conn.execute(
            "INSERT INTO webhook_events (order_id, webhook_id, event_type, status, payload) "
            "VALUES (?, ?, ?, ?, ?)",
            (order_id, webhook_id, event_type, status,
             json.dumps(payload) if payload else None),
        )
        row = conn.execute("SELECT * FROM webhook_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
        conn.commit()
        conn.close()
        return dict(row)


def get_webhook_events(order_id: str) -> list[dict]:
    with _lock:
        conn = _get_conn()
        rows = conn.execute(
            "SELECT * FROM webhook_events WHERE order_id = ? ORDER BY id ASC", (order_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
