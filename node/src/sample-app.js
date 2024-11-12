import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const API_CLIENT_ID = process.env.API_CLIENT_ID;
const API_SECRET = process.env.API_SECRET;

if (!API_CLIENT_ID) {
  throw new Error('API_CLIENT_ID is not defined');
}

if (!API_SECRET) {
  throw new Error('API_SECRET is not defined');
}

const API_REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Access-Client-Id': API_CLIENT_ID,
  'X-Access-Secret': API_SECRET,
};

const app = express();
app.use(express.json());

app.post('/api/getBridgeToken', async (req, res) => {
  const requestBody = req.body;

  const tokenResponse = await fetch(`https://prod.truv.com/v1/users/${requestBody.user_id}/tokens/`, {
    method: 'POST',
    body: JSON.stringify({
      product_type: requestBody.product_type,
      client_name: 'Truv Quickstart',
      tracking_info: '1338-0111-A',
    }),
    headers: API_REQUEST_HEADERS,
  });

  const token = await tokenResponse.json();

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(token));
});

app.post('/api/createUser', async (req, res) => {
  const requestBody = req.body;

  const userResponse = await fetch(`https://prod.truv.com/v1/users/`, {
    method: 'POST',
    body: JSON.stringify({
      external_user_id: `qs-${uuidv4()}`,
      first_name: requestBody.first_name,
      last_name: requestBody.last_name,
    }),
    headers: API_REQUEST_HEADERS,
  });

  const user = await userResponse.json();

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(user));
});

const proxyMiddleware = createProxyMiddleware({
  target: 'https://sampleapps.truveng.com/',
  changeOrigin: true,
});

app.use('/', proxyMiddleware);

app.listen(5004, () => {
  // output environment information
  console.log('='.repeat(40), 'ENVIRONMENT', '='.repeat(40));
  const environment = {
    API_CLIENT_ID,
    API_SECRET,
  };
  console.log(environment);
  console.log('='.repeat(94));
  console.log('Quickstart Loaded. Navigate to http://localhost:5004 to view Sample apps.');
});
