# Introduction
Let's get you started with Citadel by walking through this NodeJS Quickstart app. You'll need a set of API keys which you can request via email team@citadelid.com.

You'll have two different API keys (`client_id`, `access_key`) and a `public_key` for initiating the widget, and we'll start in the Sandbox environment. 


# Set up the NodeJS Quickstart
Once you have your API keys, it's time to run the Citadel NodeJS Quickstart app locally.
*Requirements*: The latest LTS version of `nodejs`

1. `git clone https://github.com/citadelid/quickstart-node`
2. `cd quickstart-node`
3. `npm install`
4. create a `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):
```
API_URL=https://prod.citadelid.com/v1/
API_PUBLIC_KEY=<YOUR PUBLIC KEY HERE>
API_SECRET=<YOUR SECRET KEY MUST BE HERE>
API_CLIENT_ID=<YOUR CLIENT_ID HERE>
API_PRODUCT_TYPE=<employment OR income>
```
5. `npm start`

After running this command, you should see:
```
======================================== ENVIRONMENT ========================================
{
  API_CLIENT_ID: <YOUR CLIENT ID HERE>,
  API_SECRET: <YOUR SECRET KEY HERE>,
  API_URL: 'https://prod.citadelid.com/v1',
  API_PUBLIC_KEY: <YOUR PUBLIC KEY HERE>,
  API_PRODUCT_TYPE: <YOUR PRODUCT TYPE HERE>
}
==============================================================================================
listening on port 5000
```

To access the app, open http://127.0.0.1:5000/ in your browser.

# Run you first verification
## Overview
The NodeJS Quickstart app emulates the experience of an applicant going through a background check/income verification and visiting the applicant portal.

Before using Citadel for verification, applicants filled out the form. 

To streamline the process and make employment/income verification easy and instant, we "hide" the form behind the button. 

If the verification is successful via Citadel, then we show to the applicant the data that we found in their payroll account. 

If the verification isn't successful or the applicant decided to exit Citadel's widget, the applicant will see the form, fill it out and the verification can be done via an existing verification process.

## Successful verification

After opening the NodeJS Quickstart app running locally, click the `Verify employment`/`Verify income` button, search for a company, eg `Facebook` and select any provider. 

Use the Sandbox credentials to simulate a successful login.

```
username: goodlogin
password: goodpassword
```

Once you have entered your credentials and moved to the next screen, you have succesfully done your first verification. 

The API call will be executed and the data will be loaded into the fields of the form.

## No verification

Now click `Add employer` button, search for a company, eg `Facebook` and select any provider. 

Click exit icon at the top right of the widget and you'll see the empty form.

# What happened under the hood

- :smiley: = User
- :computer: = Front End/Client App
- :cloud: = Back End/Server

Here is the flow that a successful verification process takes in our example:

1. [:computer: runs `CitadelBridge.init` with `public_key`](#step-1)
2. [:smiley: clicks `Verify Income/`Verify Employment` button](#step-2)
3. [:computer: displays Citadel widget, fires `onLoad` function executed](#step-3)
4. [:smiley: selects employer, choses provider, logs in, clicks `Done`](#step-4)
5. [:computer: first onSuccess function, sends request to :cloud: with temporary `token`, closes widget, first `onClose`](#step-5)
6. [:cloud: sends API request to Citadel exchanging temporary `token` for `access_token`](#step-6)
7. [:cloud: sends API request to Citadel with `access_token` for employment/income verification](#step-7)
8. [:cloud: sends employment/income verification information back to :computer:](#step-8)
9. [:computer: renders the verification info sent back by :cloud: for :smiley: to view](#step-9)

## <a id="step-1"></a>1. :computer: runs `CitadelBridge.init` with `public_key`
```
  const bridge = CitadelBridge.init({
    clientName: 'Citadel NodeJS Quickstart',
    companyMappingId: null,
    key: '{{public_key}}',
    product: 'income',
    trackingInfo: 'any data for tracking current user',
    ...
  });
  window.bridge = bridge;
```

## <a id="step-2"></a>2. :smiley: clicks `Verify Income/`Verify Employment` button
## <a id="step-3"></a>3. :computer: displays Citadel widget, fires `onLoad` function executed
```
  onLoad: function () {
    console.log('loaded');
    successClosing = null
  },
```

## <a id="step-4"></a>4. :smiley: selects employer, choses provider, logs in, clicks `Done`
## <a id="step-5"></a>5. :computer: first onSuccess function, sends request to :cloud: with temporary `token`, closes widget, first `onClose`
```
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
  renderEmploymentHistory(verificationInfo);
},
...
onClose: function () {
  console.log('closed');
  if (successClosing !== true) {
    renderEmploymentHistory([{ company: { address: {} } }]);
  }
},
```

## <a id="step-6"></a>6. :cloud: sends API request to Citadel exchanging temporary `token` for `access_token`
```
const getHeaders = () => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Access-Client-Id": API_CLIENT_ID,
    "X-Access-Secret": API_SECRET,
  }
}

const getAccessToken = async (public_token) => {
  const headers = getHeaders()
  const inputBody = JSON.stringify({
    public_tokens: [public_token],
  })

  const response = await fetch(`${API_URL}/access-tokens/`, {
    method: "POST",
    body: inputBody,
    headers: headers,
  })
  const body = await response.json()
  return body.access_tokens[0]
}
```
## <a id="step-7"></a>7. :cloud: sends API request to Citadel with `access_token` for employment/income verification
```
const getEmploymentInfoByToken = async (access_token) => {
  const requestBody = JSON.stringify({
    access_token,
  })
  return await sendRequest("verifications/employments/",requestBody)
}

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
```
## <a id="step-8"></a> 8. :cloud: sends employment/income verification information back to :computer:
```
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
## <a id="step-9"></a>9. :computer: renders the verification info sent back by :cloud: for :smiley: to view
```
function renderEmploymentHistory(employments) {
  const result = employments.map(createEmploymentCard).reduce((acc, cur) => {
    acc.appendChild(cur);
    return acc;
  }, document.createDocumentFragment());

  const historyContainer = document.querySelector('#history');
  historyContainer.appendChild(result);
  const button = document.getElementById('verify-button')
  button.style.display = 'none'
}
```