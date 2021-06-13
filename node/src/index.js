import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import htmlFile from "./serve.js"
import {
  getDdsByToken,
  completeFasFlowByToken,
  getAccessToken,
  getBridgeToken,
  getEmploymentInfoByToken,
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  getPayrollById,
  requestPayrollReport,
  getFasStatusByToken
} from "./citadel.js"

const {
  API_CLIENT_ID,
  API_SECRET,
  API_PRODUCT_TYPE,
} = process.env

const app = express()

// ensure all request bodies are parsed to JSON
app.use(bodyParser.json())

// ensure CORS requests
app.use(cors())

// return HTML
app.get("/", htmlFile)

app.get("/getBridgeToken", async (req, res) => {
  // retrieve bridge token
  try {
    const bridgeToken = await getBridgeToken()
    res.json(bridgeToken)
  } catch (e) {
    console.error("error with getBridgeToken")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/getVerifications/:token", async (req, res) => {
  // retrieve income verification information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    const accessToken = accessTokenResponse.access_token
    let verifications
    if(API_PRODUCT_TYPE === "employment") {
      verifications = await getEmploymentInfoByToken(accessToken)
    } else {
      verifications = await getIncomeInfoByToken(accessToken)
    }
    res.json(verifications)
  } catch (e) {
    console.error("error with getVerifications")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/getAdminData/:token", async (req, res) => {
  // retrieve income verification information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    const accessToken = accessTokenResponse.access_token

    const directory = await getEmployeeDirectoryByToken(accessToken)

    const reportId = (await requestPayrollReport(accessToken, '2020-01-01', '2020-02-01')).payroll_report_id

    const payroll = await getPayrollById(reportId)

    const data = { directory, payroll }
    res.json(data)
  } catch (e) {
    console.error("error with getAdminData")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

let accessToken = null

app.get("/startFasFlow/:token", async (req, res) => {
  // retrieve fas status information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    accessToken = accessTokenResponse.access_token

    const fasResult = await getFasStatusByToken(accessToken)

    res.json(fasResult)
  } catch (e) {
    console.error("error with startFasFlow")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/getDdsData/:token", async (req, res) => {
  // retrieve dds status information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    accessToken = accessTokenResponse.access_token

    const ddsResult = await getDdsByToken(accessToken)

    res.json(ddsResult)
  } catch (e) {
    console.error("error with getDdsData")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/completeFasFlow/:first_micro/:second_micro", async (req, res) => {
  // retrieve income verification information
  try {
    const fasResult = await completeFasFlowByToken(accessToken, req.params.first_micro, req.params.second_micro)

    res.json(fasResult)
  } catch (e) {
    console.error("error with completeFasFlow")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.listen(5000, () => {
  // output environment information
  console.log("=".repeat(40), "ENVIRONMENT", "=".repeat(40))
  const environment = {
    API_CLIENT_ID,
    API_SECRET,
    API_PRODUCT_TYPE,
  }
  console.log(environment)
  console.log("=".repeat(94))
  console.log("Quickstart Loaded. Navigate to http://localhost:5000 to view Quickstart.")
})
