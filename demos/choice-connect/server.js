import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from '../../shared/createApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { app, truv, db, apiLogger, start, API_PRODUCT_TYPE } = createApp({
  dirName: __dirname, demoId: 'choice-connect', port: 3005,
});

// Create user + bridge token
app.post('/api/bridge-token', async (req, res) => {
  try {
    const data = req.body || {};
    const productType = data.product_type || API_PRODUCT_TYPE;
    const orderId = data.order_id || db.generateId();

    const userResult = await truv.createUser();
    const userData = userResult.data;
    apiLogger.logApiCall({
      orderId, method: 'POST', endpoint: '/v1/users/',
      requestBody: { product_type: productType }, responseBody: userData,
      statusCode: userResult.statusCode, durationMs: userResult.durationMs,
    });

    const tokenResult = await truv.createUserBridgeToken(userData.id, productType);
    const tokenData = tokenResult.data;
    apiLogger.logApiCall({
      orderId, method: 'POST', endpoint: `/v1/users/${userData.id}/tokens/`,
      requestBody: { product_type: productType }, responseBody: tokenData,
      statusCode: tokenResult.statusCode, durationMs: tokenResult.durationMs,
    });

    res.json({ bridge_token: tokenData.bridge_token, user_id: userData.id });
  } catch (err) { console.error('POST /api/bridge-token error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

// Exchange token + get report
app.get('/api/link-report/:publicToken/:reportType', async (req, res) => {
  try {
    const { publicToken, reportType } = req.params;
    const orderId = req.query.order_id || db.generateId();

    const accessResult = await truv.getAccessToken(publicToken);
    const accessData = accessResult.data;
    apiLogger.logApiCall({
      orderId, method: 'POST', endpoint: '/v1/link-access-tokens/',
      requestBody: { public_token: publicToken }, responseBody: accessData,
      statusCode: accessResult.statusCode, durationMs: accessResult.durationMs,
    });

    const linkId = accessData.link_id;
    const reportResult = await truv.getLinkReport(linkId, reportType);
    apiLogger.logApiCall({
      orderId, method: 'GET', endpoint: `/v1/links/${linkId}/${reportType}/report`,
      responseBody: reportResult.data, statusCode: reportResult.statusCode, durationMs: reportResult.durationMs,
    });

    res.json(reportResult.data);
  } catch (err) { console.error('GET /api/link-report error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

start();
