import fetch from "node-fetch"

const { API_CLIENT_ID, API_SECRET, API_URL } = process.env

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

const getBridgeToken = async () => {
  const responseBody = await sendRequest("bridge-tokens/", {})
  return responseBody
}

/**
 * Calls out to Citadel exchanging the public token given by the API request
 * for an access token to make subsequent requests
 * @param {String} public_token The token provided by the API request to exchange
 * @return The access token provided by citadel - https://docs.citadelid.com/#exchange-token-flow
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
 * @param {String} access_token The access token provided by Citadel
 * @return The response from Citadel - https://docs.citadelid.com/#schemaemploymentcheck
 */
const getEmploymentInfoByToken = async (access_token) => {
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/employments/", {body})
}

/**
 * Retrieves income verifications from Citadel
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/#schemaincomecheck
 */
const getIncomeInfoByToken = async (access_token) => {
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/incomes/", { body })
}

const getEmployeeDirectoryByToken = async (access_token) => {
  const body = JSON.stringify({
    access_token,
  })
  return await sendRequest("administrators/directories/", { body })
}

const getPayrollReport = async (access_token, start_date, end_date) => {
  const body = JSON.stringify({
    access_token,
    start_date,
    end_date,
  })
  return await sendRequest("administrators/payrolls/", { body })
}

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
  getPayrollReport,
  getPayrollById,
}
