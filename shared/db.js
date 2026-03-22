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

// SQLite DDL exec — not child_process.exec
export function initDb() {
  const conn = getDb();
  conn.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      truv_order_id TEXT,
      user_id TEXT,
      demo_id TEXT,
      bridge_token TEXT,
      share_url TEXT,
      status TEXT DEFAULT 'created',
      raw_response TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      method TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_body TEXT,
      response_body TEXT,
      status_code INTEGER,
      duration_ms REAL,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      webhook_id TEXT,
      event_type TEXT,
      status TEXT,
      payload TEXT,
      received_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      truv_report_id TEXT,
      status TEXT DEFAULT 'pending',
      response TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_order_id ON reports(order_id);

    CREATE TABLE IF NOT EXISTS document_collections (
      id TEXT PRIMARY KEY,
      truv_collection_id TEXT,
      demo_id TEXT,
      status TEXT DEFAULT 'created',
      raw_response TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  `);

  // Migrate: add columns to existing tables if missing
  try { conn.exec('ALTER TABLE webhook_events ADD COLUMN user_id TEXT'); } catch {}
  try { conn.exec('ALTER TABLE api_logs ADD COLUMN user_id TEXT'); } catch {}
  try { conn.exec('ALTER TABLE orders ADD COLUMN product_type TEXT'); } catch {}
}

export function generateId() {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

// --- Orders ---

export function createOrder({ orderId, truvOrderId, userId, demoId, bridgeToken, shareUrl, status = 'created', rawResponse }) {
  const conn = getDb();
  conn.prepare(
    'INSERT INTO orders (id, truv_order_id, user_id, demo_id, bridge_token, share_url, status, raw_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(orderId, truvOrderId || null, userId || null, demoId || null, bridgeToken || null, shareUrl || null, status, rawResponse ? JSON.stringify(rawResponse) : null);
  return conn.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

export function getOrder(orderId) {
  return getDb().prepare('SELECT * FROM orders WHERE id = ?').get(orderId) || null;
}

const ORDER_ALLOWED_COLS = new Set(['status', 'raw_response', 'bridge_token', 'share_url', 'product_type']);

export function updateOrder(orderId, fields) {
  const keys = Object.keys(fields).filter(k => ORDER_ALLOWED_COLS.has(k));
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => {
    const v = fields[k];
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
  });
  vals.push(orderId);
  getDb().prepare(`UPDATE orders SET ${sets} WHERE id = ?`).run(...vals);
}

export function findOrderByUserId(userId) {
  return getDb().prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) || null;
}

export function getOrdersByDemoId(demoId) {
  return getDb().prepare('SELECT * FROM orders WHERE demo_id = ? ORDER BY created_at DESC').all(demoId);
}

export function getAllOrders() {
  return getDb().prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

// --- API Logs ---

export function insertApiLog({ userId, method, endpoint, requestBody, responseBody, statusCode, durationMs }) {
  const conn = getDb();
  const info = conn.prepare(
    'INSERT INTO api_logs (user_id, method, endpoint, request_body, response_body, status_code, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId || null, method, endpoint, requestBody || null, responseBody || null, statusCode || null, durationMs || null);
  return conn.prepare('SELECT * FROM api_logs WHERE id = ?').get(info.lastInsertRowid);
}

export function getApiLogsByUserId(userId) {
  return getDb().prepare('SELECT * FROM api_logs WHERE user_id = ? ORDER BY id ASC').all(userId);
}

// --- Webhook Events ---

export function insertWebhookEvent({ userId, webhookId, eventType, status, payload }) {
  const conn = getDb();
  const info = conn.prepare(
    'INSERT INTO webhook_events (user_id, webhook_id, event_type, status, payload) VALUES (?, ?, ?, ?, ?)'
  ).run(userId || null, webhookId || null, eventType || null, status || null, payload ? JSON.stringify(payload) : null);
  return conn.prepare('SELECT * FROM webhook_events WHERE id = ?').get(info.lastInsertRowid);
}

export function getWebhookEventsByUserId(userId) {
  return getDb().prepare('SELECT * FROM webhook_events WHERE user_id = ? ORDER BY id ASC').all(userId);
}

export function getAllWebhookEvents() {
  return getDb().prepare('SELECT * FROM webhook_events ORDER BY id ASC').all();
}

// --- Reports ---

export function upsertReport({ orderId, reportType, truvReportId, status, response }) {
  const conn = getDb();
  const existing = conn.prepare('SELECT id FROM reports WHERE order_id = ? AND report_type = ?').get(orderId, reportType);
  if (existing) {
    const sets = [];
    const vals = [];
    if (truvReportId) { sets.push('truv_report_id = ?'); vals.push(truvReportId); }
    if (status) { sets.push('status = ?'); vals.push(status); }
    if (response !== undefined) { sets.push('response = ?'); vals.push(typeof response === 'object' ? JSON.stringify(response) : response); }
    if (sets.length) { vals.push(existing.id); conn.prepare(`UPDATE reports SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
    return conn.prepare('SELECT * FROM reports WHERE id = ?').get(existing.id);
  }
  const info = conn.prepare(
    'INSERT INTO reports (order_id, report_type, truv_report_id, status, response) VALUES (?, ?, ?, ?, ?)'
  ).run(orderId, reportType, truvReportId || null, status || 'pending', response ? (typeof response === 'object' ? JSON.stringify(response) : response) : null);
  return conn.prepare('SELECT * FROM reports WHERE id = ?').get(info.lastInsertRowid);
}

export function getReport(orderId, reportType) {
  return getDb().prepare('SELECT * FROM reports WHERE order_id = ? AND report_type = ?').get(orderId, reportType) || null;
}

export function getReportsByOrderId(orderId) {
  return getDb().prepare('SELECT * FROM reports WHERE order_id = ? ORDER BY id ASC').all(orderId);
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

const DOC_COLLECTION_ALLOWED_COLS = new Set(['status', 'raw_response']);

export function updateDocCollection(collectionId, fields) {
  const keys = Object.keys(fields).filter(k => DOC_COLLECTION_ALLOWED_COLS.has(k));
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => {
    const v = fields[k];
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
  });
  vals.push(collectionId);
  getDb().prepare(`UPDATE document_collections SET ${sets} WHERE id = ?`).run(...vals);
}
