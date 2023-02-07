import fetch from 'node-fetch';

const { API_CLIENT_ID, API_SECRET, API_PRODUCT_TYPE } = process.env;

if (!API_CLIENT_ID || !API_SECRET) {
  console.error('Please specify API_CLIENT_ID and API_SECRET!');
  process.exit(-1);
}

/**
 * Returns the default headers used when interacting with Truv
 * @return The headers used when making requests to Truv
 **/
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Access-Client-Id': API_CLIENT_ID,
    'X-Access-Secret': API_SECRET,
  };
};

/**
 * Retrieves a bridge token from Truv
 * https://docs.truv.com/javascript--nodejs#bridge-tokens_create
 * @return The response from Truv - https://docs.truv.com/javascript--nodejs#schemabridgetoken
 */
const getBridgeToken = async () => {
  console.log('TRUV: Requesting bridge token from https://prod.truv.com/v1/bridge-tokens');
  const bodyObj = {
    product_type: API_PRODUCT_TYPE,
    client_name: 'Truv Quickstart',
    tracking_info: '1337',
  };
  if (API_PRODUCT_TYPE === 'pll' || API_PRODUCT_TYPE === 'deposit_switch') {
    bodyObj.account = {
      account_number: '16002600',
      account_type: 'checking',
      routing_number: '123456789',
      bank_name: 'TD Bank',
    };
    if (API_PRODUCT_TYPE === 'pll') {
      bodyObj.account.deposit_type = 'amount';
      bodyObj.account.deposit_value = '1';
    }
  }
  const body = JSON.stringify(bodyObj);

  const responseBody = await sendRequest('bridge-tokens/', { body });
  return responseBody;
};

/**
 * Calls out to Truv exchanging the public token given by the API request
 * for an access token to make subsequent requests
 * https://docs.truv.com/?javascript--nodejs#exchange-token-flow
 * @param {String} public_token The token provided by the API request to exchange
 * @return The access token provided by truv
 **/
const getAccessToken = async (public_token) => {
  console.log('TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens');
  console.log(`TRUV: Public Token - ${public_token}`);
  const body = JSON.stringify({
    public_token: public_token,
  });
  const responseBody = await sendRequest('link-access-tokens/', { body });
  return responseBody;
};

/**
 * Retrieves employment verifications from Truv
 * https://docs.truv.com/?javascript--nodejs#employment-verification
 * @param {String} access_token The access token provided by Truv
 * @return The response from Truv - https://docs.truv.com/javascript--nodejs#schemaemploymentcheck
 */
const getEmploymentInfoByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting employment verification data using an access_token from https://prod.truv.com/v1/verifications/employments',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('verifications/employments/', { body });
};

const createRefreshTask = async (access_token) => {
  console.log('TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks');
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('refresh/tasks/', { body });
};

const getRefreshTask = async (task_id) => {
  console.log('TRUV: Requesting a refresh task using a task_id from https://prod.truv.com/v1/refresh/tasks/{task_id}');
  console.log(`TRUV: Task ID - ${task_id}`);
  return await sendRequest(`refresh/tasks/${task_id}`, { method: 'GET' });
};

/**
 * Retrieves income verifications from Truv
 * https://docs.truv.com/?javascript--nodejs#income-verification
 * @param {String} access_token
 * @return The response from Truv - https://docs.truv.com/javascript--nodejs#schemaincomecheck
 */
const getIncomeInfoByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting income verification data using an access_token from https://prod.truv.com/v1/verifications/incomes',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('verifications/incomes/', { body });
};

/**
 * Retrieves employee directories from Truv
 * https://docs.truv.com/?javascript--nodejs#employee-directory
 * @param {String} access_token
 * @return The response from Truv - https://docs.truv.com/?javascript--nodejs#schemadirectoryresponse
 */
const getEmployeeDirectoryByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/administrators/directories',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('administrators/directories/', { body });
};

/**
 * Creates a payroll report in Truv
 * https://docs.truv.com/?javascript--nodejs#create-payroll-report
 * @param {String} access_token
 * @param {String} start_date
 * @param {String} end_date
 * @return The payroll report ID from Truv - https://docs.truv.com/?javascript--nodejs#create-payroll-admin-report-request-responseschema
 */
const requestPayrollReport = async (access_token, start_date, end_date) => {
  console.log(
    'TRUV: Requesting a payroll report be created using an access_token from https://prod.truv.com/v1/administrators/payrolls',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
    start_date,
    end_date,
  });
  return await sendRequest('administrators/payrolls/', { body });
};

/**
 * Retrieves a payroll report from Truv
 * https://docs.truv.com/?javascript--nodejs#retrieve-payroll-report
 * @param {String} report_id
 * @return The payroll report ID from Truv - https://docs.truv.com/?javascript--nodejs#create-payroll-admin-report-request-responseschema
 */
const getPayrollById = async (report_id) => {
  console.log(
    'TRUV: Requesting a payroll report using a report_id from https://prod.truv.com/v1/administrators/payrolls/{report_id}',
  );
  console.log(`TRUV: Report ID - ${report_id}`);
  return await sendRequest(`administrators/payrolls/${report_id}`, {
    method: 'GET',
  });
};

/**
 * Retrieves deposit switch status from Truv
 * https://docs.truv.com/?javascript--nodejs#direct-deposit
 * @param {String} access_token The access token provided by Truv
 * @return The response from Truv - https://docs.truv.com/?javascript--nodejs#schemadds
 */
const getDepositSwitchByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting direct deposit switch data using an access_token from https://prod.truv.com/v1/deposit_switches',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('deposit-switches/', { body });
};

/**
 * Retrieves pll status from Truv
 * https://docs.truv.com/?javascript--nodejs#paycheck-linked-loans
 * @param {String} access_token
 * @return The response from Truv - https://docs.truv.com/?javascript--nodejs#schemapll
 **/
const getPaycheckLinkedLoanByToken = async (access_token) => {
  console.log('TRUV: Requesting pll data using an access_token from https://prod.truv.com/v1/paycheck-linked-loans/');
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('paycheck-linked-loans/', { body });
};

const sendRequest = async (endpoint, { body = undefined, method = 'POST' }) => {
  const headers = getHeaders();
  try {
    const response = await fetch(`https://prod.truv.com/v1/${endpoint}`, {
      method: method,
      body,
      headers,
    });
    const responseBody = await response.json();
    return responseBody;
  } catch (e) {
    console.error(`Error with ${endpoint} request`);
    console.error(e);
    throw e;
  }
};

export {
  getDepositSwitchByToken,
  getPaycheckLinkedLoanByToken,
  getEmploymentInfoByToken,
  getAccessToken,
  getBridgeToken,
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  requestPayrollReport,
  getPayrollById,
  createRefreshTask,
  getRefreshTask,
};
