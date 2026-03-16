import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TruvClient } from '../shared/truv.js';
import * as db from '../shared/db.js';
import * as apiLogger from '../shared/api-logger.js';
import { verifyWebhookSignature } from '../shared/webhooks.js';
import { createSseHandler } from '../shared/sse.js';
import { setupWebhook, teardownWebhook } from '../shared/webhook-setup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { API_CLIENT_ID, API_SECRET } = process.env;

if (!API_CLIENT_ID || !API_SECRET) {
  console.error('Missing API_CLIENT_ID or API_SECRET in .env');
  process.exit(1);
}

const truv = new TruvClient({ clientId: API_CLIENT_ID, secret: API_SECRET });
db.initDb();

const app = express();

app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf-8'); },
}));
app.use(cors());

// Serve index.html
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Create hosted order
app.post('/api/orders', async (req, res) => {
  try {
    const data = req.body || {};
    const orderId = db.generateId();

    const params = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      ssn: data.ssn,
      product_type: data.product_type || 'employment',
    };

    const result = await truv.createOrder(params);
    const truvData = result.data;

    if (result.statusCode >= 400) {
      return res.status(result.statusCode).json({ error: 'Truv API error', details: truvData });
    }

    db.createOrder({
      orderId,
      truvOrderId: truvData.id,
      demoId: 'hosted-orders',
      bridgeToken: truvData.bridge_token,
      shareUrl: truvData.share_url,
      status: truvData.status || 'created',
      rawResponse: truvData,
    });

    apiLogger.logApiCall({
      orderId,
      method: 'POST',
      endpoint: '/v1/orders/',
      requestBody: params,
      responseBody: truvData,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });

    res.json({
      order_id: orderId,
      truv_order_id: truvData.id,
      share_url: truvData.share_url,
      status: truvData.status,
    });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order details
app.get('/api/orders/:id', async (req, res) => {
  try {
    let order = db.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.truv_order_id) {
      const result = await truv.getOrder(order.truv_order_id);
      apiLogger.logApiCall({
        orderId: order.id,
        method: 'GET',
        endpoint: `/v1/orders/${order.truv_order_id}/`,
        responseBody: result.data,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
      });
      db.updateOrder(order.id, { status: result.data.status || order.status, raw_response: result.data });
      order = db.getOrder(order.id);
    }

    const raw = order.raw_response ? JSON.parse(order.raw_response) : {};
    res.json({
      order_id: order.id,
      truv_order_id: order.truv_order_id,
      status: order.status,
      share_url: order.share_url,
      raw_response: raw,
    });
  } catch (err) {
    console.error('GET /api/orders/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API logs
app.get('/api/orders/:id/logs', (req, res) => {
  res.json(db.getApiLogs(req.params.id));
});

// Webhook events
app.get('/api/orders/:id/webhooks', (req, res) => {
  res.json(db.getWebhookEvents(req.params.id));
});

// Webhook receiver
app.post('/api/webhooks/truv', (req, res) => {
  const sigMatch = verifyWebhookSignature(req.rawBody, API_SECRET, req.headers['x-webhook-sign']);
  console.log(`TRUV: Webhook received (sig_match=${sigMatch})`);

  const payload = req.body;
  const truvOrderId = payload.order_id;

  let orderId = null;
  if (truvOrderId) {
    const order = db.findOrderByTruvId(truvOrderId);
    if (order) {
      orderId = order.id;
      if (payload.status) db.updateOrder(orderId, { status: payload.status });
    }
  }

  apiLogger.pushWebhookEvent({
    orderId,
    webhookId: payload.webhook_id,
    eventType: payload.event_type,
    status: payload.status,
    payload,
  });

  res.status(200).end();
});

// Tunnel URL
let tunnelUrl = null;
app.get('/api/tunnel-url', (_req, res) => res.json({ url: tunnelUrl }));

// SSE
app.get('/api/events/stream', createSseHandler());

app.listen(3003, async () => {
  console.log('Hosted Orders running on http://localhost:3003');
  try {
    tunnelUrl = await setupWebhook({ port: 3003, path: '/api/webhooks/truv', truvClient: truv });
  } catch (err) {
    console.error('Webhook setup failed:', err.message);
  }
});

process.on('SIGINT', async () => {
  await teardownWebhook(truv);
  process.exit(0);
});
