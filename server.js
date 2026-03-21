import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TruvClient } from './shared/truv.js';
import * as db from './shared/db.js';
import * as apiLogger from './shared/api-logger.js';
import { verifyWebhookSignature } from './shared/webhooks.js';
import { setupWebhook, teardownWebhook } from './shared/webhook-setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const { API_CLIENT_ID, API_SECRET, API_PRODUCT_TYPE,
  TEMPLATE_ID_INCOME, TEMPLATE_ID_EMPLOYMENT, TEMPLATE_ID_ASSETS, TEMPLATE_ID_IDENTITY } = process.env;

if (!API_CLIENT_ID || !API_SECRET) { console.error('Missing API_CLIENT_ID or API_SECRET in .env'); process.exit(1); }

const truv = new TruvClient({ clientId: API_CLIENT_ID, secret: API_SECRET });
db.initDb();

function getTemplateId(productType) {
  return { income: TEMPLATE_ID_INCOME, employment: TEMPLATE_ID_EMPLOYMENT, assets: TEMPLATE_ID_ASSETS, identity: TEMPLATE_ID_IDENTITY }[productType] || undefined;
}

const app = express();
app.use(express.json({ limit: '100mb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf-8'); } }));
app.use(cors());

// --- Static assets ---
app.use('/shared', express.static(path.join(__dirname, 'shared')));
['application', 'follow-up', 'employee-portal', 'upload-documents', 'choice-connect'].forEach(id => {
  app.use(`/${id}`, express.static(path.join(__dirname, 'demos', id)));
});

app.get('/api/config', (_req, res) => res.json({ product_type: API_PRODUCT_TYPE }));

// --- Webhook receiver ---
app.post('/api/webhooks/truv', (req, res) => {
  const sigMatch = verifyWebhookSignature(req.rawBody, API_SECRET, req.headers['x-webhook-sign']);
  if (!sigMatch) { console.warn('Webhook signature mismatch'); return res.status(401).end(); }
  console.log(`Webhook: ${req.body.event_type} (${req.body.status || '-'}) user=${req.body.user_id || '-'}`);

  const payload = req.body;
  const userId = payload.user_id || null;

  // Update order status if completed
  if (userId && payload.event_type === 'order-status-updated' && payload.status === 'completed') {
    const order = db.findOrderByUserId(userId);
    if (order) db.updateOrder(order.id, { status: 'completed' });
  }

  apiLogger.pushWebhookEvent({ userId, webhookId: payload.webhook_id, eventType: payload.event_type, status: payload.status, payload });
  res.status(200).end();
});

// --- Tunnel URL ---
let tunnelUrl = null;
app.get('/api/tunnel-url', (_req, res) => res.json({ url: tunnelUrl }));

// --- Polling endpoints (user_id based) ---
app.get('/api/users/:userId/webhooks', (req, res) => res.json(db.getWebhookEventsByUserId(req.params.userId)));
app.get('/api/users/:userId/logs', (req, res) => res.json(db.getApiLogsByUserId(req.params.userId)));

// --- Order routes ---

app.get('/api/orders', (req, res) => {
  try {
    const demoId = req.query.demo_id;
    const orders = demoId ? db.getOrdersByDemoId(demoId) : db.getAllOrders();
    res.json(orders.map(o => ({
      order_id: o.id, truv_order_id: o.truv_order_id, user_id: o.user_id, demo_id: o.demo_id,
      status: o.status, share_url: o.share_url, created_at: o.created_at,
      raw_response: o.raw_response ? JSON.parse(o.raw_response) : {},
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const data = req.body || {};
    const orderId = db.generateId();
    const productType = data.product_type || API_PRODUCT_TYPE;
    const params = {
      first_name: data.first_name, last_name: data.last_name,
      email: data.email, phone: data.phone, ssn: data.ssn,
      product_type: productType, template_id: getTemplateId(productType),
    };

    const result = await truv.createOrder(params);
    const truvData = result.data;
    if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: truvData });

    const userId = truvData.user_id;
    db.createOrder({ orderId, truvOrderId: truvData.id, userId, demoId: data.demo_id || 'default', bridgeToken: truvData.bridge_token, shareUrl: truvData.share_url, status: truvData.status || 'created', rawResponse: truvData });
    apiLogger.logApiCall({ userId, method: 'POST', endpoint: '/v1/orders/', requestBody: params, responseBody: truvData, statusCode: result.statusCode, durationMs: result.durationMs });

    res.json({ order_id: orderId, truv_order_id: truvData.id, user_id: userId, bridge_token: truvData.bridge_token, status: truvData.status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    let order = db.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const userId = order.user_id;

    if (order.truv_order_id) {
      const result = await truv.getOrder(order.truv_order_id);
      apiLogger.logApiCall({ userId, method: 'GET', endpoint: `/v1/orders/${order.truv_order_id}/`, responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs });
      if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: result.data });
      db.updateOrder(order.id, { status: result.data.status || order.status, raw_response: result.data });
      order = db.getOrder(order.id);
    }

    const raw = order.raw_response ? JSON.parse(order.raw_response) : {};

    let voa_report = null, voie_report = null;
    if (raw.voa_report_id && userId) {
      const r = await truv.getVoaReport(userId, raw.voa_report_id);
      apiLogger.logApiCall({ userId, method: 'GET', endpoint: `/v1/users/${userId}/assets/reports/${raw.voa_report_id}/`, responseBody: r.data, statusCode: r.statusCode, durationMs: r.durationMs });
      if (r.statusCode < 400) voa_report = r.data;
    }
    if (raw.voie_report_id && userId) {
      const r = await truv.getVoieReport(userId, raw.voie_report_id);
      apiLogger.logApiCall({ userId, method: 'GET', endpoint: `/v1/users/${userId}/reports/${raw.voie_report_id}/`, responseBody: r.data, statusCode: r.statusCode, durationMs: r.durationMs });
      if (r.statusCode < 400) voie_report = r.data;
    }

    res.json({ order_id: order.id, truv_order_id: order.truv_order_id, user_id: userId, status: order.status, bridge_token: order.bridge_token, share_url: order.share_url, raw_response: raw, voa_report, voie_report });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/orders/:id/refresh', async (req, res) => {
  try {
    const order = db.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.truv_order_id) return res.status(400).json({ error: 'No Truv order ID' });

    const result = await truv.refreshOrder(order.truv_order_id);
    apiLogger.logApiCall({ userId: order.user_id, method: 'POST', endpoint: `/v1/orders/${order.truv_order_id}/refresh/`, responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs });
    res.json(result.data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// --- Choice-Connect routes ---

app.post('/api/bridge-token', async (req, res) => {
  try {
    const data = req.body || {};
    const productType = data.product_type || API_PRODUCT_TYPE;

    const userResult = await truv.createUser();
    const userId = userResult.data.id;
    apiLogger.logApiCall({ userId, method: 'POST', endpoint: '/v1/users/', requestBody: { product_type: productType }, responseBody: userResult.data, statusCode: userResult.statusCode, durationMs: userResult.durationMs });

    const tokenResult = await truv.createUserBridgeToken(userId, productType);
    apiLogger.logApiCall({ userId, method: 'POST', endpoint: `/v1/users/${userId}/tokens/`, requestBody: { product_type: productType }, responseBody: tokenResult.data, statusCode: tokenResult.statusCode, durationMs: tokenResult.durationMs });

    res.json({ bridge_token: tokenResult.data.bridge_token, user_id: userId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/link-report/:publicToken/:reportType', async (req, res) => {
  try {
    const { publicToken, reportType } = req.params;
    const userId = req.query.user_id || null;

    const accessResult = await truv.getAccessToken(publicToken);
    apiLogger.logApiCall({ userId, method: 'POST', endpoint: '/v1/link-access-tokens/', requestBody: { public_token: publicToken }, responseBody: accessResult.data, statusCode: accessResult.statusCode, durationMs: accessResult.durationMs });

    const linkId = accessResult.data.link_id;
    const reportResult = await truv.getLinkReport(linkId, reportType);
    apiLogger.logApiCall({ userId, method: 'GET', endpoint: `/v1/links/${linkId}/${reportType}/report`, responseBody: reportResult.data, statusCode: reportResult.statusCode, durationMs: reportResult.durationMs });

    res.json(reportResult.data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// --- Upload-Documents routes ---

app.post('/api/collections', async (req, res) => {
  try {
    const { documents, users } = req.body;
    if (!documents?.length) return res.status(400).json({ error: 'documents array is required' });

    const collectionId = db.generateId();
    const result = await truv.createDocumentCollection(documents, users);
    const truvData = result.data;
    if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: truvData });

    db.createDocCollection({ collectionId, truvCollectionId: truvData.id, demoId: 'upload-documents', status: truvData.status || 'created', rawResponse: truvData });
    res.json({ collection_id: collectionId, truv_collection_id: truvData.id, status: truvData.status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/collections/:id', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.truv_collection_id) {
      const result = await truv.getDocumentCollection(collection.truv_collection_id);
      if (result.statusCode < 400) db.updateDocCollection(collection.id, { status: result.data.status || collection.status, raw_response: result.data });
    }
    const updated = db.getDocCollection(req.params.id);
    const raw = updated.raw_response ? JSON.parse(updated.raw_response) : {};
    res.json({ collection_id: updated.id, truv_collection_id: updated.truv_collection_id, status: updated.status, raw_response: raw });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/collections/:id/upload', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    const { documents } = req.body;
    if (!documents?.length) return res.status(400).json({ error: 'documents array is required' });
    const result = await truv.uploadToCollection(collection.truv_collection_id, documents);
    res.json(result.data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/collections/:id/finalize', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    const result = await truv.finalizeCollection(collection.truv_collection_id);
    db.updateDocCollection(collection.id, { status: 'finalizing' });
    res.json(result.data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/collections/:id/results', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    const result = await truv.getFinalizationResults(collection.truv_collection_id);
    if (result.data.status) db.updateDocCollection(collection.id, { status: result.data.status, raw_response: result.data });
    res.json(result.data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// --- Legacy endpoints (for old HTML demos) ---
app.get('/api/orders/:id/logs', (req, res) => {
  const order = db.getOrder(req.params.id);
  res.json(order ? db.getApiLogsByUserId(order.user_id) : []);
});
app.get('/api/orders/:id/webhooks', (req, res) => {
  const order = db.getOrder(req.params.id);
  res.json(order ? db.getWebhookEventsByUserId(order.user_id) : []);
});
app.get('/api/webhooks', (_req, res) => res.json(db.getAllWebhookEvents()));

// --- Start ---
app.listen(PORT, async () => {
  console.log(`Truv Quickstart running on http://localhost:${PORT}`);
  try { tunnelUrl = await setupWebhook({ path: '/api/webhooks/truv', truvClient: truv }); } catch (err) { console.error('Webhook setup failed:', err.message); }
});

process.on('SIGINT', async () => { await teardownWebhook(truv); process.exit(0); });
