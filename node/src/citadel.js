import fetch from "node-fetch"

const { API_CLIENT_ID, API_SECRET, API_PRODUCT_TYPE } = process.env

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
 * https://docs.citadelid.com/javascript--nodejs#bridge-tokens_create
 * @return The response from Citadel - https://docs.citadelid.com/javascript--nodejs#schemabridgetoken
 */
const getBridgeToken = async () => {
  console.log("CITADEL: Requesting bridge token from https://prod.citadelid.com/v1/bridge-tokens")
  const productType = API_PRODUCT_TYPE.startsWith("admin") ? "admin" : API_PRODUCT_TYPE
  const bodyObj = {
    product_type: productType,
    client_name: "Citadel Quickstart",
    tracking_info: "1337"
  }
  if(API_PRODUCT_TYPE === "fas" || API_PRODUCT_TYPE === "deposit_switch") {
    bodyObj.account = {
      account_number: "16002600",
      account_type: "checking",
      routing_number: "123456789",
      bank_name: "TD Bank"
    }
  }
  const body = JSON.stringify(bodyObj)

  const responseBody = await sendRequest("bridge-tokens/", {body})
  return responseBody
}

/**
 * Calls out to Citadel exchanging the public token given by the API request
 * for an access token to make subsequent requests
 * https://docs.citadelid.com/?javascript--nodejs#exchange-token-flow
 * @param {String} public_token The token provided by the API request to exchange
 * @return The access token provided by citadel
 **/
const getAccessToken = async (public_token) => {
  console.log("CITADEL: Exchanging a public_token for an access_token from https://prod.citadelid.com/v1/link-access-tokens")
  console.log(`CITADEL: Public Token - ${public_token}`)
  const body = JSON.stringify({
    public_token: public_token,
  })
  const responseBody = await sendRequest("link-access-tokens/", {body})
  return responseBody
}

/**
 * Retrieves employment verifications from Citadel
 * https://docs.citadelid.com/?javascript--nodejs#employment-verification
 * @param {String} access_token The access token provided by Citadel
 * @return The response from Citadel - https://docs.citadelid.com/javascript--nodejs#schemaemploymentcheck
 */
const getEmploymentInfoByToken = async (access_token) => {
  console.log("CITADEL: Requesting employment verification data using an access_token from https://prod.citadelid.com/v1/verifications/employments")
  console.log(`CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/employments/", {body})
}

/**
 * Retrieves income verifications from Citadel
 * https://docs.citadelid.com/?javascript--nodejs#income-verification
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/javascript--nodejs#schemaincomecheck
 */
const getIncomeInfoByToken = async (access_token) => {
  console.log("CITADEL: Requesting income verification data using an access_token from https://prod.citadelid.com/v1/verifications/incomes")
  console.log(`CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/incomes/", { body })
}

/**
 * Retrieves employee directories from Citadel
 * https://docs.citadelid.com/?javascript--nodejs#employee-directory
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/?javascript--nodejs#schemadirectoryresponse
 */
const getEmployeeDirectoryByToken = async (access_token) => {
  console.log("CITADEL: Requesting employee directory data using an access_token from https://prod.citadelid.com/v1/administrators/directories")
  console.log( `CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("administrators/directories/", { body })
}

/**
 * Creates a payroll report in Citadel
 * https://docs.citadelid.com/?javascript--nodejs#create-payroll-report
 * @param {String} access_token
 * @param {String} start_date
 * @param {String} end_date
 * @return The payroll report ID from Citadel - https://docs.citadelid.com/?javascript--nodejs#create-payroll-admin-report-request-responseschema
 */
const requestPayrollReport = async (access_token, start_date, end_date) => {
  console.log("CITADEL: Requesting a payroll report be created using an access_token from https://prod.citadelid.com/v1/administrators/payrolls")
  console.log(`CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
    start_date,
    end_date,
  })
  return await sendRequest("administrators/payrolls/", { body })
}

/**
 * Retrieves a payroll report from Citadel
 * https://docs.citadelid.com/?javascript--nodejs#retrieve-payroll-report
 * @param {String} report_id
 * @return The payroll report ID from Citadel - https://docs.citadelid.com/?javascript--nodejs#create-payroll-admin-report-request-responseschema
 */
const getPayrollById = async (report_id) => {
  console.log("CITADEL: Requesting a payroll report using a report_id from https://prod.citadelid.com/v1/administrators/payrolls/{report_id}")
  console.log(`CITADEL: Report ID - ${report_id}`)
  return await sendRequest(`administrators/payrolls/${report_id}`, {
    method: "GET",
  })
}

/**
 * Retrieves funding switch status from Citadel
 * https://docs.citadelid.com/?javascript--nodejs#funding-account
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/?javascript--nodejs#schemafas
 **/
 const getFundingSwitchStatusByToken = async (access_token) => {
  console.log("CITADEL: Requesting funding switch update data using an access_token from https://prod.citadelid.com/v1/account-switches")
  console.log(`CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("account-switches/", {body})
}

/**
 * Requests a task refresh from Citadel to complete the Funding account switch flow
 * https://docs.citadelid.com/?javascript--nodejs#data-refresh
 * @param {String} access_token
 * @param {Number} first_micro
 * @param {Number} second_micro
 * @return The response from Citadel - https://docs.citadelid.com/?javascript--nodejs#schemarefreshtaskcreateresponse
 */
 const completeFundingSwitchFlowByToken = async (access_token, first_micro, second_micro) => {
  console.log("CITADEL: Completing funding switch flow with a Task refresh using an access_token from https://prod.citadelid.com/v1/refresh/tasks")
  console.log(`CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
    settings: { micro_deposits: [ parseFloat(first_micro), parseFloat(second_micro) ] }
  })
  return await sendRequest("refresh/tasks/", { body })
}

/**
 * Retrieves deposit switch status from Citadel
 * https://docs.citadelid.com/?javascript--nodejs#direct-deposit
 * @param {String} access_token The access token provided by Citadel
 * @return The response from Citadel - https://docs.citadelid.com/?javascript--nodejs#schemadds
 */
 const getDepositSwitchByToken = async (access_token) => {
  console.log("CITADEL: Requesting direct deposit switch data using an access_token from https://prod.citadelid.com/v1/deposit_switches")
  console.log(`CITADEL: Access Token - ${access_token}`)
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("deposit-switches/", {body})
}

const sendRequest = async (endpoint, { body = undefined, method = "POST" }) => {
  const headers = getHeaders()
  try {
    const response = await fetch(`https://prod.citadelid.com/v1/${endpoint}`, {
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
  getDepositSwitchByToken,
  getFundingSwitchStatusByToken,
  completeFundingSwitchFlowByToken,
  getEmploymentInfoByToken,
  getAccessToken,
  getBridgeToken,
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  requestPayrollReport,
  getPayrollById,
}
