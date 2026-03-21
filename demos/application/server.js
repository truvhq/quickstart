import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from '../../shared/createApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { app, truv, db, apiLogger, start, API_PRODUCT_TYPE, getTemplateId } = createApp({
  dirName: __dirname, demoId: 'application', port: 3001,
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const data = req.body || {};
    const orderId = db.generateId();
    const params = {
      first_name: data.first_name, last_name: data.last_name,
      email: data.email, phone: data.phone, ssn: data.ssn,
      product_type: data.product_type || API_PRODUCT_TYPE,
      template_id: getTemplateId(data.product_type || API_PRODUCT_TYPE),
    };

    const result = await truv.createOrder(params);
    const truvData = result.data;
    if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: truvData });

    db.createOrder({
      orderId, truvOrderId: truvData.id, userId: truvData.user_id,
      demoId: 'application', bridgeToken: truvData.bridge_token,
      shareUrl: truvData.share_url, status: truvData.status || 'created', rawResponse: truvData,
    });
    apiLogger.logApiCall({
      orderId, method: 'POST', endpoint: '/v1/orders/',
      requestBody: params, responseBody: truvData,
      statusCode: result.statusCode, durationMs: result.durationMs,
    });

    res.json({ order_id: orderId, truv_order_id: truvData.id, user_id: truvData.user_id, bridge_token: truvData.bridge_token, status: truvData.status });
  } catch (err) { console.error('POST /api/orders error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Get order details
app.get('/api/orders/:id', async (req, res) => {
  try {
    let order = db.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.truv_order_id) {
      const result = await truv.getOrder(order.truv_order_id);
      apiLogger.logApiCall({
        orderId: order.id, method: 'GET', endpoint: `/v1/orders/${order.truv_order_id}/`,
        responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs,
      });
      if (result.statusCode >= 400) return res.status(result.statusCode).json({ error: 'Truv API error', details: result.data });
      db.updateOrder(order.id, { status: result.data.status || order.status, raw_response: result.data });
      order = db.getOrder(order.id);
    }

    const raw = order.raw_response ? JSON.parse(order.raw_response) : {};

    // Fetch reports if available
    let voa_report = null, voie_report = null;
    if (raw.voa_report_id && raw.user_id) {
      const r = await truv.getVoaReport(raw.user_id, raw.voa_report_id);
      apiLogger.logApiCall({ orderId: order.id, method: 'GET', endpoint: `/v1/users/${raw.user_id}/assets/reports/${raw.voa_report_id}/`, responseBody: r.data, statusCode: r.statusCode, durationMs: r.durationMs });
      if (r.statusCode < 400) voa_report = r.data;
    }
    if (raw.voie_report_id && raw.user_id) {
      const r = await truv.getVoieReport(raw.user_id, raw.voie_report_id);
      apiLogger.logApiCall({ orderId: order.id, method: 'GET', endpoint: `/v1/users/${raw.user_id}/reports/${raw.voie_report_id}/`, responseBody: r.data, statusCode: r.statusCode, durationMs: r.durationMs });
      if (r.statusCode < 400) voie_report = r.data;
    }

    res.json({ order_id: order.id, truv_order_id: order.truv_order_id, status: order.status, bridge_token: order.bridge_token, share_url: order.share_url, raw_response: raw, voa_report, voie_report });
  } catch (err) { console.error('GET /api/orders/:id error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Refresh order
app.post('/api/orders/:id/refresh', async (req, res) => {
  try {
    const order = db.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.truv_order_id) return res.status(400).json({ error: 'No Truv order ID' });

    const result = await truv.refreshOrder(order.truv_order_id);
    apiLogger.logApiCall({
      orderId: order.id, method: 'POST', endpoint: `/v1/orders/${order.truv_order_id}/refresh/`,
      responseBody: result.data, statusCode: result.statusCode, durationMs: result.durationMs,
    });
    res.json(result.data);
  } catch (err) { console.error('POST /api/orders/:id/refresh error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

start();
