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
 * @return The access token provided by citadel
 **/
const getAccessToken = async (public_token) => {
  const headers = getHeaders()
  const inputBody = JSON.stringify({
    public_tokens: [public_token],
  })

  try {
    const response = await fetch(`${API_URL}access-tokens/`, {
      method: "POST",
      body: inputBody,
      headers: headers,
    })
    const body = await response.json()
    return body.access_tokens[0]
  } catch (e) {
    console.error("Error with /access-tokens/ request")
    console.error(e)
    throw e
  }
}

/**
 * Retrieves employment verifications from Citadel
 * @param {String} access_token The access token provided by Citadel
 * @return The response from Citadel
 */
const getEmploymentInfoByToken = async (access_token) => {
  const headers = getHeaders()
  const inputBody = JSON.stringify({
    access_token,
  })

  try {
    const response = await fetch(`${API_URL}verifications/employments/`, {
      method: "POST",
      body: inputBody,
      headers: headers,
    })
    const body = await response.json()
    return body
  } catch (e) {
    console.error("Error with /verifications/employments/ request")
    console.error(e)
    throw e
  }
}

/**
 * Retrieves income verifications from Citadel
 * @param {String} access_token
 * @return The response from Citadel
 */
const getIncomeInfoByToken = async (access_token) => {
  const headers = getHeaders()
  const inputBody = JSON.stringify({
    access_token,
  })

  try {
    const response = await fetch(`${API_URL}verifications/incomes/`, {
      method: "POST",
      body: inputBody,
      headers: headers,
    })
    const body = await response.json()
    return body
  } catch (e) {
    console.error("Error with /verifications/incomes/ request")
    console.error(e)
    throw e
  }
}

export { getEmploymentInfoByToken, getAccessToken, getIncomeInfoByToken }
