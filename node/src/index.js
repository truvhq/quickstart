/* eslint-disable no-case-declarations */
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import htmlFile from './serve.js';
import crypto from 'crypto';

import {
  getAccessToken,
  getEmployeeDirectoryByToken,
  getPayrollById,
  requestPayrollReport,
  createRefreshTask,
  getRefreshTask,
  createUser,
  createUserBridgeToken,
  getLinkReport,
  createOrder,
} from './truv.js';

const { API_CLIENT_ID, API_SECRET, API_PRODUCT_TYPE, IS_ORDER } = process.env;

const generate_webhook_sign = (body, key) => {
  return 'v1=' + crypto.createHmac('sha256', key).update(body).digest('hex');
};

const app = express();
let accessToken = null;
let accessTokenResponse = null;

// Helper function to validate access token
const validateAccessToken = () => {
  if (!accessToken) {
    throw new Error('No access token available. Please complete verification first.');
  }
  return accessToken;
};

// ensure all request bodies are parsed to JSON
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ensure CORS requests
app.use(cors());

// return HTML
app.get('/', htmlFile);

app.get('/getBridgeToken', async (req, res) => {
  // retrieve bridge token
  try {
    if (IS_ORDER === 'true' || IS_ORDER === true) {
      const order = await createOrder();
      res.json(order);
    } else {
      const user = await createUser();
      const bridgeToken = await createUserBridgeToken(user.id);
      res.json(bridgeToken);
    }
  } catch (e) {
    console.error('error with getBridgeToken');
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.get('/getVerifications/:token', async (req, res) => {
  // retrieve income verification information
  try {
    accessTokenResponse = await getAccessToken(req.params.token);
    if (!accessTokenResponse || !accessTokenResponse.access_token) {
      throw new Error('Failed to obtain access token');
    }
    accessToken = accessTokenResponse.access_token;
    const verifications = await getLinkReport(accessTokenResponse.link_id, API_PRODUCT_TYPE);
    res.json(verifications);
  } catch (e) {
    console.error('error with getVerifications:', e.message);
    res.status(e.message.includes('access token') ? 400 : 500).json({ 
      success: false, 
      error: e.message 
    });
  }
});

app.get('/createRefreshTask', async (req, res) => {
  // create a refresh task for a payroll connection that's already been made.
  try {
    validateAccessToken();
    const refreshTask = await createRefreshTask(accessToken);

    let taskStatus = await getRefreshTask(refreshTask.task_id);

    const finishedStatuses = [
      'done',
      'login_error',
      'mfa_error',
      'config_error',
      'account_locked',
      'no_data',
      'unavailable',
      'error',
    ];

    while (finishedStatuses.indexOf(taskStatus.status) < 0) {
      console.log('TRUV: Refresh task is not finished. Waiting 2 seconds, then checking again.');
      await sleep(2000);
      taskStatus = await getRefreshTask(refreshTask.task_id);
    }

    console.log('TRUV: Refresh task is finished. Pulling the latest data.');
    switch (API_PRODUCT_TYPE) {
      case 'employment':
      case 'income':
        res.json(await getLinkReport(accessTokenResponse.link_id, API_PRODUCT_TYPE));
        break;
      case 'admin':
        const accessToken = accessTokenResponse.access_token;
        const directory = await getEmployeeDirectoryByToken(accessToken);
        // A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
        const reportId = (await requestPayrollReport(accessToken, '2020-01-01', '2020-02-01')).payroll_report_id;
        const payroll = await getPayrollById(reportId);
        const data = { directory, payroll };
        res.json(data);
        break;
    }
  } catch (e) {
    console.error('error with createRefreshTask');
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.get('/getAdminData/:token', async (req, res) => {
  // retrieve income verification information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token);
    accessToken = accessTokenResponse.access_token;

    const directory = await getEmployeeDirectoryByToken(accessToken);

    // A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
    const reportId = (await requestPayrollReport(accessToken, '2020-01-01', '2020-02-01')).payroll_report_id;
    const payroll = await getPayrollById(reportId);

    const data = { directory, payroll };
    res.json(data);
  } catch (e) {
    console.error('error with getAdminData');
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.get('/getDepositSwitchData/:token', async (req, res) => {
  // retrieve deposit switch status information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token);
    const depositSwitchResult = await getLinkReport(accessTokenResponse.link_id, 'direct_deposit');

    res.json(depositSwitchResult);
  } catch (e) {
    console.error('error with getDepositSwitchData');
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.get('/getPaycheckLinkedLoanData/:token', async (req, res) => {
  // retrieve paycheck linked loan information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token);
    const payCheckLinkedLoadResult = await getLinkReport(accessTokenResponse.link_id, 'pll');

    res.json(payCheckLinkedLoadResult);
  } catch (e) {
    console.error('error with getPaycheckLinkedLoanData');
    console.error(e);
    res.status(500).json({ success: false });
  }
});

app.post('/webhook', async (req, res) => {
  console.log('TRUV: Webhook Received');
  const body = req.rawBody.toString();

  const webhook_sign = generate_webhook_sign(body, API_SECRET);
  console.log(`TRUV: Event type:      ${req.body.event_type}`);
  console.log(`TRUV: Status:          ${req.body.status}`);
  console.log(`TRUV: Signature match: ${webhook_sign === req.headers['x-webhook-sign']}\n`);

  res.status(200).end();
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(5004, () => {
  // output environment information
  console.log('='.repeat(40), 'ENVIRONMENT', '='.repeat(40));
  const environment = {
    API_CLIENT_ID,
    API_SECRET,
    API_PRODUCT_TYPE,
  };
  console.log(environment);
  console.log('='.repeat(94));
  console.log('Quickstart Loaded. Navigate to http://localhost:5004 to view Quickstart.');
});
