import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import htmlFile from "./serve.js"
import {
  getAccessToken,
  getBridgeToken,
  getEmploymentInfoByToken,
  getIncomeInfoByToken,
} from "./citadel.js"

const {
  API_CLIENT_ID,
  API_SECRET,
  API_URL,
  API_PUBLIC_KEY,
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
  // retrieve income verification information
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

app.listen(5000, () => {
  // output environment information
  console.log("=".repeat(40), "ENVIRONMENT", "=".repeat(40))
  const environment = {
    API_CLIENT_ID,
    API_SECRET,
    API_URL,
    API_PUBLIC_KEY,
    API_PRODUCT_TYPE,
  }
  console.log(environment)
  console.log("=".repeat(94))
  console.log("listening on port 5000")
})
