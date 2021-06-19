# NodeJS Quickstart

## Introduction

Let's get you started with Citadel by walking through this NodeJS Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.citadelid.com](https://dashboard.citadelid.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

## Set up the NodeJS Quickstart

Once you have your API keys, it's time to run the Citadel NodeJS Quickstart app locally.
*Requirements*: The latest LTS version of `nodejs`

1. `git clone https://github.com/citadelid/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

    ```bash
    API_CLIENT_ID=<YOUR CLIENT_ID HERE>
    API_SECRET=<YOUR SECRET KEY MUST BE HERE>
    API_PRODUCT_TYPE=<employment, income, admin-directory, admin-report, deposit_switch or fas>
    ```

5. `make node_local`

After running this command, you should see:

```output
======================================== ENVIRONMENT ========================================
{
  API_CLIENT_ID: <YOUR CLIENT ID HERE>,
  API_SECRET: <YOUR SECRET KEY HERE>,
  API_PRODUCT_TYPE: <YOUR PRODUCT TYPE HERE>
}
==============================================================================================
listening on port 5000
```

To access the app, open [http://127.0.0.1:5000/](http://127.0.0.1:5000/) in your browser.

## What happens under the hood

Here is the flow that a successful verification process takes in our example:

1. [Front end sends request to back end for `bridge_token`](#step-1)
2. [Back end sends API request to Citadel for `bridge_token`, sends response to front end](#step-2)
3. [Front end runs `CitadelBridge.init` with `bridge_token`](#step-3)
4. [User clicks `Connect` button](#step-4)
5. [Front end displays Citadel widget, executes `onLoad` callback function](#step-5)
6. [User follows instructions, choses provider, logs in, clicks `Done`](#step-6)
7. [Front end executes `onSuccess` callback function, sends request to back end with `public_token`, closes widget](#step-7)
8. [Back end sends API request to Citadel exchanging `public_token` for `access_token`](#step-8)
9. [Back end sends API request to Citadel with `access_token` for payroll data](#step-9)
10. [Back end sends payroll data back to front end](#step-10)
11. [Front end renders the verification info sent back by back end for user to view](#step-11)

### <a id="step-1"></a>1. Front end sends request to back end for `bridge_token`

```javascript
  const getBridgeToken = async () => {
    const response = await fetch(apiEnpoint + `getBridgeToken`, {
      method: 'get',
      headers,
    }).then((r) => r.json());
    return response;
  }
```

### <a id="step-2"></a>2. Back end sends API request to Citadel for `bridge_token`, sends response to front end

```javascript
  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Access-Client-Id": API_CLIENT_ID,
      "X-Access-Secret": API_SECRET,
    }
  }

  ...

  const getBridgeToken = async () => {
    const responseBody = await sendRequest("bridge-tokens/")
    return responseBody
  }

  ...

  const sendRequest = async (endpoint, body) => {
    const headers = getHeaders()
    try {
      const response = await fetch(`https://prod.citadelid.com/v1/${endpoint}`, {
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
```

```javascript
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
```

### <a id="step-3"></a>3. Front end runs `CitadelBridge.init` with `bridge_token`

```javascript
  const bridge = CitadelBridge.init({
    bridgeToken: bridgeToken.bridge_token,
    ...
  });
  window.bridge = bridge;
```

### <a id="step-4"></a>4. User clicks `Connect` button

### <a id="step-5"></a>5. Front end displays Citadel widget, executes `onLoad` callback function

```javascript
  onLoad: function () {
    console.log('loaded');
    successClosing = null
  },
```

### <a id="step-6"></a>6. User follows instructions, choses provider, logs in, clicks `Done`

### <a id="step-7"></a>7. Front end executes `onSuccess` callback function, sends request to back end with `public_token`, closes widget

```javascript
onSuccess: async function (token) {
  console.log('token: ', token);

  successClosing = true

  const content = document.querySelector('.spinnerContainer');

  content.classList.remove('hidden');
  let verificationInfo;
  try {
    verificationInfo = await apiRequests.getVerificationInfoByToken(token);
  } catch(e) {
    console.error(e)
    content.classList.add('hidden');
    return;
  }
  content.classList.add('hidden');

  if (!verificationInfo.length) {
    return;
  }
            
  setUserInfo(verificationInfo[0]);
  renderPayrollData(verificationInfo);
},
...
onClose: function () {
  console.log('closed');
  if (successClosing !== true) {
    renderPayrollData([{ company: { address: {} } }]);
  }
},
```

### <a id="step-8"></a>8. Back end sends API request to Citadel exchanging `public_token` for `access_token`

```javascript
const getAccessToken = async (public_token) => {
  const body = JSON.stringify({
    public_token: public_token,
  })
  const responseBody = await sendRequest("link-access-tokens/", {body})
  return responseBody.access_token
}
```

### <a id="step-9"></a>9. Back end sends API request to Citadel with `access_token` for payroll data

```javascript
const getEmploymentInfoByToken = async (access_token) => {
  const requestBody = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/employments/",requestBody)
}

...

const getIncomeInfoByToken = async (access_token) => {
  const requestBody = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/incomes/",requestBody)
}
```

### <a id="step-10"></a> 10. Back end sends payroll data back to front end

```javascript
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
    res.status(500).json({ success: false })
  }
})
```

### <a id="step-11"></a>11. Front end renders the payroll data sent back by back end for user to view

```javascript
function renderPayrollData(data) {
  const historyContainer = document.querySelector("#history")
  historyContainer.innerHTML = JSON.stringify(data, null, 2)
}
```
