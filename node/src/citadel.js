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

/**
 * Calls out to Citadel exchanging the public token given by the API request
 * for an access token to make subsequent requests
 * @param {String} public_token The token provided by the API request to exchange
 * @return The access token provided by citadel - https://docs.citadelid.com/#exchange-token-flow
 **/
const getAccessToken = async (public_token) => {
  const requestBody = JSON.stringify({
    public_tokens: [public_token],
  })
  const responseBody = await sendRequest("access-tokens/",requestBody)
  return responseBody.access_tokens[0]
}

/**
 * Retrieves employment verifications from Citadel
 * @param {String} access_token The access token provided by Citadel
 * @return The response from Citadel - https://docs.citadelid.com/#schemaemploymentcheck
 */
const getEmploymentInfoByToken = async (access_token) => {
  const requestBody = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/employments/",requestBody)
}

/**
 * Retrieves income verifications from Citadel
 * @param {String} access_token
 * @return The response from Citadel - https://docs.citadelid.com/#schemaincomecheck
 */
const getIncomeInfoByToken = async (access_token) => {
  const requestBody = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/incomes/",requestBody)
}

const sendRequest = async (endpoint, body) => {
  const headers = getHeaders()
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
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

export { getEmploymentInfoByToken, getAccessToken, getIncomeInfoByToken }
