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
const { API_CLIENT_ID, API_SECRET, API_PRODUCT_TYPE, TEMPLATE_ID } = process.env;

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

// Expose config to frontend
app.get('/api/config', (_req, res) => res.json({ product_type: API_PRODUCT_TYPE }));

// Create user + bridge token
app.post('/api/bridge-token', async (req, res) => {
  try {
    const data = req.body || {};
    const productType = data.product_type || API_PRODUCT_TYPE;
    const orderId = data.order_id;

    const userResult = await truv.createUser();
    const userData = userResult.data;

    if (orderId) {
      apiLogger.logApiCall({
        orderId,
        method: 'POST',
        endpoint: '/v1/users/',
        requestBody: { product_type: productType },
        responseBody: userData,
        statusCode: userResult.statusCode,
        durationMs: userResult.durationMs,
      });
    }

    const tokenResult = await truv.createUserBridgeToken(userData.id, productType);
    const tokenData = tokenResult.data;

    if (orderId) {
      apiLogger.logApiCall({
        orderId,
        method: 'POST',
        endpoint: `/v1/users/${userData.id}/tokens/`,
        requestBody: { product_type: productType },
        responseBody: tokenData,
        statusCode: tokenResult.statusCode,
        durationMs: tokenResult.durationMs,
      });
    }

    res.json({
      bridge_token: tokenData.bridge_token,
      user_id: userData.id,
    });
  } catch (err) {
    console.error('POST /api/bridge-token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Exchange token + get report
app.get('/api/link-report/:publicToken/:reportType', async (req, res) => {
  try {
    const { publicToken, reportType } = req.params;
    const orderId = req.query.order_id;

    const accessResult = await truv.getAccessToken(publicToken);
    const accessData = accessResult.data;

    if (orderId) {
      apiLogger.logApiCall({
        orderId,
        method: 'POST',
        endpoint: '/v1/link-access-tokens/',
        requestBody: { public_token: publicToken },
        responseBody: accessData,
        statusCode: accessResult.statusCode,
        durationMs: accessResult.durationMs,
      });
    }

    const linkId = accessData.link_id;
    const reportResult = await truv.getLinkReport(linkId, reportType);

    if (orderId) {
      apiLogger.logApiCall({
        orderId,
        method: 'GET',
        endpoint: `/v1/links/${linkId}/${reportType}/report`,
        responseBody: reportResult.data,
        statusCode: reportResult.statusCode,
        durationMs: reportResult.durationMs,
      });
    }

    res.json(reportResult.data);
  } catch (err) {
    console.error('GET /api/link-report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API logs
app.get('/api/orders/:id/logs', (req, res) => {
  res.json(db.getApiLogs(req.params.id));
});

// Webhook receiver
app.post('/api/webhooks/truv', (req, res) => {
  const sigMatch = verifyWebhookSignature(req.rawBody, API_SECRET, req.headers['x-webhook-sign']);
  if (!sigMatch) { console.warn('Webhook signature mismatch — ignoring'); return res.status(401).end(); }
  console.log(`TRUV: Webhook received event_type=${req.body.event_type} status=${req.body.status}`);

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

app.listen(3005, async () => {
  console.log('Choice Connect running on http://localhost:3005');
  try {
    tunnelUrl = await setupWebhook({ path: '/api/webhooks/truv', truvClient: truv });
  } catch (err) {
    console.error('Webhook setup failed:', err.message);
  }
});

process.on('SIGINT', async () => {
  await teardownWebhook(truv);
  process.exit(0);
});
