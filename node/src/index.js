import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import htmlFile from "./serve.js"
import crypto from "crypto"

import {
  getDepositSwitchByToken,
  completeFundingSwitchFlowByToken,
  getAccessToken,
  getBridgeToken,
  getEmploymentInfoByToken,
  getIncomeInfoByToken,
  getEmployeeDirectoryByToken,
  getPayrollById,
  requestPayrollReport,
  getFundingSwitchStatusByToken,
  createRefreshTask,
  getRefreshTask
} from "./citadel.js"

const {
  API_CLIENT_ID,
  API_SECRET,
  API_PRODUCT_TYPE,
} = process.env

const generate_webhook_sign = (body, key) => {
  return "v1=" + crypto.createHmac("sha256", key)
  .update(body)
  .digest("hex")
}

const app = express()
let accessToken = null

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
    const accessTokenResponse = await getAccessToken(req.params.token)
    accessToken = accessTokenResponse.access_token
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

app.get("/createRefreshTask", async (req, res) => {
  // create a refresh task for a payroll connection that's already been made.
  try {
    const refreshTask = await createRefreshTask(accessToken)

    let taskStatus = await getRefreshTask(refreshTask.task_id)

    const finishedStatuses = ["done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"]

    while(finishedStatuses.indexOf(taskStatus.status) < 0) {
      console.log("CITADEL: Refresh task is not finished. Waiting 2 seconds, then checking again.")
      await sleep(2000)
      taskStatus = await getRefreshTask(refreshTask.task_id)
    }

    console.log("CITADEL: Refresh task is finished. Pulling the latest data.")
    switch (API_PRODUCT_TYPE) {
      case "employment":
        res.json(await getEmploymentInfoByToken(accessToken))
        break;
      case "income":
        res.json(await getIncomeInfoByToken(accessToken))
        break;
      case "admin":
        const directory = await getEmployeeDirectoryByToken(accessToken)
        // A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
        const reportId = (await requestPayrollReport(accessToken, '2020-01-01', '2020-02-01')).payroll_report_id
        const payroll = await getPayrollById(reportId)
        const data = { directory, payroll }
        res.json(data)
        break;
    }
  } catch (e) {
    console.error("error with createRefreshTask")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/getAdminData/:token", async (req, res) => {
  // retrieve income verification information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    accessToken = accessTokenResponse.access_token

    const directory = await getEmployeeDirectoryByToken(accessToken)

    // A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
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

app.get("/startFundingSwitchFlow/:token", async (req, res) => {
  // retrieve funding switch status information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    accessToken = accessTokenResponse.access_token

    const fundingSwitchResult = await getFundingSwitchStatusByToken(accessToken)

    res.json(fundingSwitchResult)
  } catch (e) {
    console.error("error with startFundingSwitchFlow")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/getDepositSwitchData/:token", async (req, res) => {
  // retrieve deposit switch status information
  try {
    const accessTokenResponse = await getAccessToken(req.params.token)
    accessToken = accessTokenResponse.access_token

    const depositSwitchResult = await getDepositSwitchByToken(accessToken)

    res.json(depositSwitchResult)
  } catch (e) {
    console.error("error with getDepositSwitchData")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.get("/completeFundingSwitchFlow/:first_micro/:second_micro", async (req, res) => {
  // retrieve income verification information
  try {
    const fundingSwitchResult = await completeFundingSwitchFlowByToken(accessToken, req.params.first_micro, req.params.second_micro)

    res.json(fundingSwitchResult)
  } catch (e) {
    console.error("error with completeFundingSwitchFlow")
    console.error(e)
    res.status(500).json({ success: false })
  }
})

app.post("/webhook", async (req, res) => {

  console.log("CITADEL: Webhook Received")
  const body = req.rawBody.toString()
  
  const webhook_sign = generate_webhook_sign(body, API_SECRET)
  console.log(`CITADEL: Event type:      ${req.body.event_type}`)
  console.log(`CITADEL: Status:          ${req.body.status}`)
  console.log(`CITADEL: Signature match: ${webhook_sign === req.headers['x-webhook-sign']}\n`)
  
  res.status(200).end()
})

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}   

app.listen(5050, () => {
  // output environment information
  console.log("=".repeat(40), "ENVIRONMENT", "=".repeat(40))
  const environment = {
    API_CLIENT_ID,
    API_SECRET,
    API_PRODUCT_TYPE,
  }
  console.log(environment)
  console.log("=".repeat(94))
  console.log("Quickstart Loaded. Navigate to http://localhost:5050 to view Quickstart.")
})
