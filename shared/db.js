import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'quickstart.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb() {
  const conn = getDb();
  conn.exec(`
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

    CREATE TABLE IF NOT EXISTS document_collections (
      id TEXT PRIMARY KEY,
      truv_collection_id TEXT,
      demo_id TEXT,
      status TEXT DEFAULT 'created',
      raw_response TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function generateId() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

// --- Orders ---

export function createOrder({ orderId, truvOrderId, demoId, bridgeToken, shareUrl, status = 'created', rawResponse }) {
  const conn = getDb();
  conn.prepare(
    'INSERT INTO orders (id, truv_order_id, demo_id, bridge_token, share_url, status, raw_response) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(orderId, truvOrderId || null, demoId || null, bridgeToken || null, shareUrl || null, status, rawResponse ? JSON.stringify(rawResponse) : null);
  return conn.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

export function getOrder(orderId) {
  return getDb().prepare('SELECT * FROM orders WHERE id = ?').get(orderId) || null;
}

export function updateOrder(orderId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => {
    const v = fields[k];
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
  });
  vals.push(orderId);
  getDb().prepare(`UPDATE orders SET ${sets} WHERE id = ?`).run(...vals);
}

export function findOrderByTruvId(truvOrderId) {
  return getDb().prepare('SELECT * FROM orders WHERE truv_order_id = ?').get(truvOrderId) || null;
}

// --- API Logs ---

export function insertApiLog({ orderId, method, endpoint, requestBody, responseBody, statusCode, durationMs }) {
  const conn = getDb();
  const info = conn.prepare(
    'INSERT INTO api_logs (order_id, method, endpoint, request_body, response_body, status_code, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(orderId, method, endpoint, requestBody || null, responseBody || null, statusCode || null, durationMs || null);
  return conn.prepare('SELECT * FROM api_logs WHERE id = ?').get(info.lastInsertRowid);
}

export function getApiLogs(orderId) {
  return getDb().prepare('SELECT * FROM api_logs WHERE order_id = ? ORDER BY id ASC').all(orderId);
}

// --- Webhook Events ---

export function insertWebhookEvent({ orderId, webhookId, eventType, status, payload }) {
  const conn = getDb();
  const info = conn.prepare(
    'INSERT INTO webhook_events (order_id, webhook_id, event_type, status, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(orderId || null, webhookId || null, eventType || null, status || null, payload ? JSON.stringify(payload) : null);
  return conn.prepare('SELECT * FROM webhook_events WHERE id = ?').get(info.lastInsertRowid);
}

export function getWebhookEvents(orderId) {
  return getDb().prepare('SELECT * FROM webhook_events WHERE order_id = ? ORDER BY id ASC').all(orderId);
}

export function getAllWebhookEvents() {
  return getDb().prepare('SELECT * FROM webhook_events ORDER BY id ASC').all();
}

// --- Orders: list queries ---

export function getOrdersByDemoId(demoId) {
  return getDb().prepare('SELECT * FROM orders WHERE demo_id = ? ORDER BY created_at DESC').all(demoId);
}

export function getAllOrders() {
  return getDb().prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

// --- Document Collections ---

export function createDocCollection({ collectionId, truvCollectionId, demoId, status = 'created', rawResponse }) {
  const conn = getDb();
  conn.prepare(
    'INSERT INTO document_collections (id, truv_collection_id, demo_id, status, raw_response) VALUES (?, ?, ?, ?, ?)'
  ).run(collectionId, truvCollectionId || null, demoId || null, status, rawResponse ? JSON.stringify(rawResponse) : null);
  return conn.prepare('SELECT * FROM document_collections WHERE id = ?').get(collectionId);
}

export function getDocCollection(collectionId) {
  return getDb().prepare('SELECT * FROM document_collections WHERE id = ?').get(collectionId) || null;
}

export function updateDocCollection(collectionId, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => {
    const v = fields[k];
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
  });
  vals.push(collectionId);
  getDb().prepare(`UPDATE document_collections SET ${sets} WHERE id = ?`).run(...vals);
}

export function getAllDocCollections() {
  return getDb().prepare('SELECT * FROM document_collections ORDER BY created_at DESC').all();
}
