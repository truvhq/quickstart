"""API call logging, PII redaction, and SSE pub/sub."""

import json
import queue
import threading
from typing import Callable

from . import db

# PII fields to redact
REDACTED_KEYS = {"ssn", "email", "phone", "date_of_birth", "social_security_number"}

# SSE subscribers: {order_id: [queue.Queue, ...]}
_subscribers: dict[str, list[queue.Queue]] = {}
_sub_lock = threading.Lock()


def redact_sensitive(body):
    """Recursively redact PII fields, keeping last 4 chars."""
    if isinstance(body, list):
        return [redact_sensitive(item) for item in body]
    if isinstance(body, dict):
        redacted = {}
        for key, val in body.items():
            if key in REDACTED_KEYS and isinstance(val, str):
                redacted[key] = "***" + val[-4:] if len(val) > 4 else "***"
            else:
                redacted[key] = redact_sensitive(val)
        return redacted
    return body


def log_api_call(order_id: str, method: str, endpoint: str,
                 request_body=None, response_body=None,
                 status_code: int = None, duration_ms: float = None) -> dict:
    """Store an API call log and push to SSE subscribers."""
    redacted_request = json.dumps(redact_sensitive(request_body)) if request_body else None
    response_str = json.dumps(response_body) if response_body else None

    log_entry = db.insert_api_log(
        order_id=order_id,
        method=method,
        endpoint=endpoint,
        request_body=redacted_request,
        response_body=response_str,
        status_code=status_code,
        duration_ms=duration_ms,
    )

    _publish(order_id, "api_call", {
        "id": log_entry["id"],
        "method": method,
        "endpoint": endpoint,
        "request_body": redacted_request,
        "response_body": response_str,
        "status_code": status_code,
        "duration_ms": duration_ms,
        "timestamp": log_entry["timestamp"],
    })

    return log_entry


def push_webhook_event(order_id: str = None, webhook_id: str = None,
                       event_type: str = None, status: str = None,
                       payload: dict = None) -> dict:
    """Store a webhook event and push to SSE subscribers."""
    event = db.insert_webhook_event(
        order_id=order_id,
        webhook_id=webhook_id,
        event_type=event_type,
        status=status,
        payload=payload,
    )

    _publish(order_id, "webhook", {
        "id": event["id"],
        "webhook_id": webhook_id,
        "event_type": event_type,
        "status": status,
        "payload": payload,
        "received_at": event["received_at"],
    })

    return event


def subscribe(order_id: str) -> queue.Queue:
    """Subscribe to events for a given order. Returns a Queue."""
    q = queue.Queue(maxsize=100)
    with _sub_lock:
        if order_id not in _subscribers:
            _subscribers[order_id] = []
        _subscribers[order_id].append(q)
    return q


def unsubscribe(order_id: str, q: queue.Queue):
    """Remove a subscriber queue."""
    with _sub_lock:
        if order_id in _subscribers:
            try:
                _subscribers[order_id].remove(q)
            except ValueError:
                pass
            if not _subscribers[order_id]:
                del _subscribers[order_id]


def _publish(order_id: str, event_type: str, data: dict):
    """Push an event to all subscribers for this order."""
    if not order_id:
        return
    with _sub_lock:
        queues = list(_subscribers.get(order_id, []))
    for q in queues:
        try:
            q.put_nowait({"event": event_type, "data": data})
        except queue.Full:
            pass
