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

// Increase JSON body limit for base64-encoded files (10MB per file, up to 10 files)
app.use(express.json({
  limit: '100mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf-8'); },
}));
app.use(cors());

// Serve index.html
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Create document collection
app.post('/api/collections', async (req, res) => {
  try {
    const { documents, users } = req.body;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'documents array is required' });
    }

    const collectionId = db.generateId();

    const result = await truv.createDocumentCollection(documents, users);
    const truvData = result.data;

    if (result.statusCode >= 400) {
      return res.status(result.statusCode).json({ error: 'Truv API error', details: truvData });
    }

    db.createDocCollection({
      collectionId,
      truvCollectionId: truvData.id,
      demoId: 'upload-documents',
      status: truvData.status || 'created',
      rawResponse: truvData,
    });

    apiLogger.logApiCall({
      orderId: collectionId,
      method: 'POST',
      endpoint: '/v1/documents/collections/',
      requestBody: { documents_count: documents.length },
      responseBody: truvData,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });

    res.json({
      collection_id: collectionId,
      truv_collection_id: truvData.id,
      status: truvData.status,
    });
  } catch (err) {
    console.error('POST /api/collections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get collection status
app.get('/api/collections/:id', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    if (collection.truv_collection_id) {
      const result = await truv.getDocumentCollection(collection.truv_collection_id);

      apiLogger.logApiCall({
        orderId: collection.id,
        method: 'GET',
        endpoint: `/v1/documents/collections/${collection.truv_collection_id}/`,
        responseBody: result.data,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
      });

      db.updateDocCollection(collection.id, {
        status: result.data.status || collection.status,
        raw_response: result.data,
      });
    }

    const updated = db.getDocCollection(req.params.id);
    const raw = updated.raw_response ? JSON.parse(updated.raw_response) : {};
    res.json({
      collection_id: updated.id,
      truv_collection_id: updated.truv_collection_id,
      status: updated.status,
      raw_response: raw,
    });
  } catch (err) {
    console.error('GET /api/collections/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload more files to collection
app.post('/api/collections/:id/upload', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const { documents } = req.body;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'documents array is required' });
    }

    const result = await truv.uploadToCollection(collection.truv_collection_id, documents);

    apiLogger.logApiCall({
      orderId: collection.id,
      method: 'POST',
      endpoint: `/v1/documents/collections/${collection.truv_collection_id}/upload/`,
      requestBody: { documents_count: documents.length },
      responseBody: result.data,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });

    res.json(result.data);
  } catch (err) {
    console.error('POST /api/collections/:id/upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finalize collection
app.post('/api/collections/:id/finalize', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const result = await truv.finalizeCollection(collection.truv_collection_id);

    apiLogger.logApiCall({
      orderId: collection.id,
      method: 'POST',
      endpoint: `/v1/documents/collections/${collection.truv_collection_id}/finalize/`,
      responseBody: result.data,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });

    db.updateDocCollection(collection.id, { status: 'finalizing' });
    res.json(result.data);
  } catch (err) {
    console.error('POST /api/collections/:id/finalize error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get finalization results
app.get('/api/collections/:id/results', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const result = await truv.getFinalizationResults(collection.truv_collection_id);

    apiLogger.logApiCall({
      orderId: collection.id,
      method: 'GET',
      endpoint: `/v1/documents/collections/${collection.truv_collection_id}/finalize/`,
      responseBody: result.data,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
    });

    if (result.data.status) {
      db.updateDocCollection(collection.id, { status: result.data.status, raw_response: result.data });
    }

    res.json(result.data);
  } catch (err) {
    console.error('GET /api/collections/:id/results error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API logs (reuse order_id column for collection tracking)
app.get('/api/orders/:id/logs', (req, res) => {
  res.json(db.getApiLogs(req.params.id));
});

// Webhook receiver
app.post('/api/webhooks/truv', (req, res) => {
  const sigMatch = verifyWebhookSignature(req.rawBody, API_SECRET, req.headers['x-webhook-sign']);
  console.log(`TRUV: Webhook received (sig_match=${sigMatch})`);

  const payload = req.body;
  apiLogger.pushWebhookEvent({
    orderId: null,
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

app.listen(3004, async () => {
  console.log('Upload Documents running on http://localhost:3004');
  try {
    tunnelUrl = await setupWebhook({ port: 3004, path: '/api/webhooks/truv', truvClient: truv });
  } catch (err) {
    console.error('Webhook setup failed:', err.message);
  }
});

process.on('SIGINT', async () => {
  await teardownWebhook(truv);
  process.exit(0);
});
