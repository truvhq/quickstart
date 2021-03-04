import fetch from "node-fetch"

const { API_CLIENT_ID, API_SECRET, API_URL, API_PRODUCT_TYPE } = process.env

/**
 * Returns the default headers used when interacting with Citadel
 * @return The headers used when making requests to Citadel
 **/
const getHeaders = () => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Access-Client-Id": API_CLIENT_ID,
    "X-Access-Secret": API_SECRET,
  }
}

/**
 * Retrieves a bridge token from Citadel
 * https://docs.citadelid.com/javascript#bridge-tokens_create
 * @return The response from Citadel - https://docs.citadelid.com/javascript#schemabridgetoken
 */
const getBridgeToken = async () => {
  const body = JSON.stringify({
    product_type: API_PRODUCT_TYPE,
    client_name: "Citadel Quickstart",
    tracking_info: "1337"
  })
  const responseBody = await sendRequest("bridge-tokens/", {body})
  return responseBody
}

/**
 * Calls out to Citadel exchanging the public token given by the API request
 * for an access token to make subsequent requests
 * https://docs.citadelid.com/?javascript#exchange-token-flow
 * @param {String} public_token The token provided by the API request to exchange
 * @return The access token provided by citadel
 **/
const getAccessToken = async (public_token) => {
  const body = JSON.stringify({
    public_tokens: [public_token],
  })
  const responseBody = await sendRequest("access-tokens/", {body})
  return responseBody.access_tokens[0]
}

/**
 * Retrieves employment verifications from Citadel
 * https://docs.citadelid.com/?javascript#employment-verification
 * @param {String} access_token The access token provided by Citadel
 * @return The response from Citadel - https://docs.citadelid.com/javascript#schemaemploymentcheck
 */
const getEmploymentInfoByToken = async (access_token) => {
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/employments/", {body})
}

/**
 * Retrieves income verifications from Citadel
 * https://docs.citadelid.com/?javascript#income-verification
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/javascript#schemaincomecheck
 */
const getIncomeInfoByToken = async (access_token) => {
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/incomes/", { body })
}

/**
 * Retrieves employee directories from Citadel
 * https://docs.citadelid.com/?javascript#employee-directory
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/?javascript#schemadirectoryresponse
 */
const getEmployeeDirectoryByToken = async (access_token) => {
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("administrators/directories/", { body })
}

/**
 * Creates a payroll report in Citadel
 * https://docs.citadelid.com/?javascript#create-payroll-report
 * @param {String} access_token
 * @param {String} start_date
 * @param {String} end_date
 * @return The payroll report ID from Citadel - https://docs.citadelid.com/?javascript#create-payroll-admin-report-request-responseschema
 */
const requestPayrollReport = async (access_token, start_date, end_date) => {
  const body = JSON.stringify({
    access_token,
    start_date,
    end_date,
  })
  return await sendRequest("administrators/payrolls/", { body })
}

/**
 * Retrieves a payroll report from Citadel
 * https://docs.citadelid.com/?javascript#retrieve-payroll-report
 * @param {String} report_id
 * @return The payroll report ID from Citadel - https://docs.citadelid.com/?javascript#create-payroll-admin-report-request-responseschema
 */
const getPayrollById = async (report_id) => {
  return await sendRequest(`administrators/payrolls/${report_id}`, {
    method: "GET",
  })
}

const sendRequest = async (endpoint, { body = undefined, method = "POST" }) => {
  const headers = getHeaders()
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: method,
      body,
      headers,
    })
    const responseBody = await response.json()
    return responseBody
  } catch (e) {
    console.error(`Error with ${endpoint} request`)
    console.error(e)
    throw e
  }
}

export {
  getEmploymentInfoByToken,
  getAccessToken,
  getBridgeToken,
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  requestPayrollReport,
  getPayrollById,
}
