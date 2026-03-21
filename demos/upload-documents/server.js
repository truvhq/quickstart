import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from '../../shared/createApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { app, truv, db, apiLogger, start } = createApp({
  dirName: __dirname, demoId: 'upload-documents', port: 3004,
  jsonLimit: '100mb',
});

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
    if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: truvData });

    db.createDocCollection({
      collectionId, truvCollectionId: truvData.id,
      demoId: 'upload-documents', status: truvData.status || 'created', rawResponse: truvData,
    });
    apiLogger.logApiCall({
      orderId: collectionId, // collection ID used as correlation key for API logs
      method: 'POST', endpoint: '/v1/documents/collections/',
      requestBody: { documents_count: documents.length }, responseBody: truvData,
      statusCode: result.statusCode, durationMs: result.durationMs,
    });

    res.json({ collection_id: collectionId, truv_collection_id: truvData.id, status: truvData.status });
  } catch (err) { console.error('POST /api/collections error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Get collection status
app.get('/api/collections/:id', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    if (collection.truv_collection_id) {
      const result = await truv.getDocumentCollection(collection.truv_collection_id);
      apiLogger.logApiCall({
        orderId: collection.id, // collection ID used as correlation key for API logs
        method: 'GET',
        endpoint: `/v1/documents/collections/${collection.truv_collection_id}/`,
        responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs,
      });
      if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: result.data });
      db.updateDocCollection(collection.id, { status: result.data.status || collection.status, raw_response: result.data });
    }

    const updated = db.getDocCollection(req.params.id);
    const raw = updated.raw_response ? JSON.parse(updated.raw_response) : {};
    res.json({ collection_id: updated.id, truv_collection_id: updated.truv_collection_id, status: updated.status, raw_response: raw });
  } catch (err) { console.error('GET /api/collections/:id error:', err); res.status(500).json({ error: 'Internal server error' }); }
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
      orderId: collection.id, method: 'POST',
      endpoint: `/v1/documents/collections/${collection.truv_collection_id}/upload/`,
      requestBody: { documents_count: documents.length }, responseBody: result.data,
      statusCode: result.statusCode, durationMs: result.durationMs,
    });
    res.json(result.data);
  } catch (err) { console.error('POST /api/collections/:id/upload error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Finalize collection
app.post('/api/collections/:id/finalize', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const result = await truv.finalizeCollection(collection.truv_collection_id);
    apiLogger.logApiCall({
      orderId: collection.id, method: 'POST',
      endpoint: `/v1/documents/collections/${collection.truv_collection_id}/finalize/`,
      responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs,
    });
    db.updateDocCollection(collection.id, { status: 'finalizing' });
    res.json(result.data);
  } catch (err) { console.error('POST /api/collections/:id/finalize error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Get finalization results
app.get('/api/collections/:id/results', async (req, res) => {
  try {
    const collection = db.getDocCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const result = await truv.getFinalizationResults(collection.truv_collection_id);
    apiLogger.logApiCall({
      orderId: collection.id, method: 'GET',
      endpoint: `/v1/documents/collections/${collection.truv_collection_id}/finalize/`,
      responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs,
    });
    if (result.data.status) {
      db.updateDocCollection(collection.id, { status: result.data.status, raw_response: result.data });
    }
    res.json(result.data);
  } catch (err) { console.error('GET /api/collections/:id/results error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

start();
