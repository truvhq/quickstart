import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import htmlFile from "./serve.js"
import crypto from "crypto"

import {
  getAccessToken,
  getBridgeToken,
  getEmploymentInfoByToken,
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  getPayrollById,
  requestPayrollReport
} from "./citadel.js"

const {
  API_CLIENT_ID,
  API_SECRET,
  API_PRODUCT_TYPE,
} = process.env

const generate_webhook_sign = (body, key) => {
  return crypto.createHmac("sha256", key)
  .update(body)
  .digest("hex")
}

const app = express()

// ensure all request bodies are parsed to JSON
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))

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
    const accessToken = await getAccessToken(req.params.token)
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
    const accessToken = await getAccessToken(req.params.token)

    const directory = await getEmployeeDirectoryByToken(accessToken)

    const reportId = (await requestPayrollReport(accessToken, '2020-01-01', '2020-02-01')).payroll_report_id

    const payroll = await getPayrollById(reportId)

    const data = { directory, payroll }
    res.json(data)
  } catch (e) {
    console.error("error with getVerifications")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.post("/webhook", async (req, res) => {

  const body = req.rawBody.toString()
  const webhook_sign = generate_webhook_sign(body, API_SECRET)
  
  res.send(`v1=${webhook_sign}`).end()
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
