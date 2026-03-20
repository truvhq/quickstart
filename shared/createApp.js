// shared/createApp.js — Common Express app setup for all quickstart demos.
// Handles: middleware, webhook receiver, SSE, API logs, webhook setup/teardown.
// Each demo server just calls createApp() and adds its own routes.

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TruvClient } from './truv.js';
import * as db from './db.js';
import * as apiLogger from './api-logger.js';
import { verifyWebhookSignature } from './webhooks.js';
import { createSseHandler } from './sse.js';
import { setupWebhook, teardownWebhook } from './webhook-setup.js';

export function createApp({ dirName, demoId, port, webhookMatch = 'user_id', jsonLimit = '1mb' }) {
  const { API_CLIENT_ID, API_SECRET, API_PRODUCT_TYPE, TEMPLATE_ID } = process.env;

  if (!API_CLIENT_ID || !API_SECRET) {
    console.error('Missing API_CLIENT_ID or API_SECRET in .env');
    process.exit(1);
  }

  const truv = new TruvClient({ clientId: API_CLIENT_ID, secret: API_SECRET });
  db.initDb();

  const app = express();

  // Capture raw body for webhook HMAC verification
  app.use(express.json({
    limit: jsonLimit,
    verify: (req, _res, buf) => { req.rawBody = buf.toString('utf-8'); },
  }));
  app.use(cors());

  // Serve shared frontend assets
  const sharedDir = path.resolve(dirName, '..', '..', 'shared');
  app.get('/shared/styles.css', (_req, res) => res.sendFile(path.join(sharedDir, 'styles.css')));
  app.get('/shared/panel.js', (_req, res) => res.sendFile(path.join(sharedDir, 'panel.js')));

  // Serve index.html
  app.get('/', (_req, res) => res.sendFile(path.join(dirName, 'index.html')));

  // Expose config to frontend
  app.get('/api/config', (_req, res) => res.json({ product_type: API_PRODUCT_TYPE }));

  // API logs for an order
  app.get('/api/orders/:id/logs', (req, res) => {
    res.json(db.getApiLogs(req.params.id));
  });

  // Webhook events (all, unfiltered)
  app.get('/api/webhooks', (_req, res) => {
    res.json(db.getAllWebhookEvents());
  });

  // Webhook events (per order)
  app.get('/api/orders/:id/webhooks', (req, res) => {
    res.json(db.getWebhookEvents(req.params.id));
  });

  // Webhook receiver — verifies HMAC, matches to order (by user_id or order_id), stores event
  app.post('/api/webhooks/truv', (req, res) => {
    const sigMatch = verifyWebhookSignature(req.rawBody, API_SECRET, req.headers['x-webhook-sign']);
    if (!sigMatch) { console.warn('Webhook signature mismatch — ignoring'); return res.status(401).end(); }
    console.log(`Webhook: ${req.body.event_type} (${req.body.status || '-'})`);

    const payload = req.body;
    let orderId = null;
    if (webhookMatch === 'user_id' && payload.user_id) {
      const order = db.findOrderByUserId(payload.user_id);
      if (order) {
        orderId = order.id;
        if (payload.event_type === 'order-status-updated' && payload.status === 'completed') {
          db.updateOrder(orderId, { status: 'completed' });
        }
      }
    } else if (webhookMatch === 'order_id' && payload.order_id) {
      const order = db.findOrderByTruvId(payload.order_id);
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

  // SSE stream
  app.get('/api/events/stream', createSseHandler());

  // Start server + register webhooks
  function start() {
    app.listen(port, async () => {
      console.log(`${demoId} running on http://localhost:${port}`);
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
  }

  return { app, truv, db, apiLogger, start, API_PRODUCT_TYPE, TEMPLATE_ID };
}
