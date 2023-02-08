import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

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
 * Create a user
 * https://docs.truv.com/reference/users_create
 * @returns The response from Truv
 */
const createUser = async () => {
  console.log('TRUV: Requesting a user from https://prod.truv.com/v1/users/');
  const bodyObj = {
    external_user_id: `qs-${uuidv4()}`,
    first_name: 'John',
    last_name: 'Johnson',
    email: 'j.johnson@example.com',
  };
  const body = JSON.stringify(bodyObj);

  const responseBody = await sendRequest('users/', { body });
  return responseBody;
};

/**
 * Create a bridge token for a user
 * https://docs.truv.com/reference/users_tokens
 * @param {String} user_id
 * @returns The response from Truv
 */
const createUserBridgeToken = async (user_id) => {
  console.log('TRUV: Requesting user bridge token from https://prod.truv.com/v1/users/{user_id}/tokens');
  console.log(`TRUV: User ID - ${user_id}`);

  const bodyObj = {
    product_type: API_PRODUCT_TYPE,
    client_name: 'Truv Quickstart',
    tracking_info: '1338-0111-A',
  };

  if (API_PRODUCT_TYPE === 'pll' || API_PRODUCT_TYPE === 'deposit_switch') {
    bodyObj.account = {
      account_number: '16002600',
      account_type: 'checking',
      routing_number: '123456789',
      bank_name: 'TD Bank',
    };

    if (API_PRODUCT_TYPE === 'pll') {
      bodyObj.account = { ...bodyObj.account, deposit_type: 'amount', deposit_value: '100' };
    }
  }

  const body = JSON.stringify(bodyObj);

  const responseBody = await sendRequest(`users/${user_id}/tokens/`, { body });
  return responseBody;
};

/**
 * Calls out to Truv exchanging the public token given by the API request
 * for an access token to make subsequent requests
 * https://docs.truv.com/reference/link_exchange_token_flow
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
 * https://docs.truv.com/reference/employment_verification
 * @param {String} access_token The access token provided by Truv
 * @return The response from Truv
 */
const getEmploymentInfoByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting employment verification data using an access_token from https://prod.truv.com/v1/links/reports/employment/',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('links/reports/employment/', { body });
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
 * https://docs.truv.com/reference/income_verification
 * @param {String} access_token
 * @return The response from Truv
 */
const getIncomeInfoByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting income verification data using an access_token from https://prod.truv.com/v1/links/reports/income/',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('links/reports/income/', { body });
};

/**
 * Retrieves employee directories from Truv
 * @param {String} access_token
 * @return The response from Truv
 */
const getEmployeeDirectoryByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/links/reports/admin/',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('links/reports/admin/', { body });
};

/**
 * Creates a payroll report in Truv
 * @param {String} access_token
 * @param {String} start_date
 * @param {String} end_date
 * @return The payroll report ID from Truv
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
 * @param {String} report_id
 * @return The payroll report ID from Truv
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
 * https://docs.truv.com/reference/dds_report
 * @param {String} access_token The access token provided by Truv
 * @return The response from Truv
 */
const getDepositSwitchByToken = async (access_token) => {
  console.log(
    'TRUV: Requesting direct deposit switch data using an access_token from https://prod.truv.com/v1/links/reports/direct_deposit/',
  );
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('links/reports/direct_deposit/', { body });
};

/**
 * Retrieves pll status from Truv
 * https://docs.truv.com/reference/pll_report
 * @param {String} access_token
 * @return The response from Truv
 **/
const getPaycheckLinkedLoanByToken = async (access_token) => {
  console.log('TRUV: Requesting pll data using an access_token from https://prod.truv.com/v1/links/reports/ppl/');
  console.log(`TRUV: Access Token - ${access_token}`);
  const body = JSON.stringify({
    access_token,
  });
  return await sendRequest('links/reports/ppl/', { body });
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
    console.log(`Response: ${method} ${endpoint} - ${response.status}\n ${JSON.stringify(responseBody)}`);
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
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  requestPayrollReport,
  getPayrollById,
  createRefreshTask,
  getRefreshTask,
  createUser,
  createUserBridgeToken,
};
