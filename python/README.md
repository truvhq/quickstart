# Introduction
Let's get you started with Citadel by walking through this Python Quickstart app. You'll need a set of API keys which you can get by signing up at https://dashboard.citadelid.com

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

# Set up the Python Quickstart
Once you have your API keys, it's time to run the Citadel Python Quickstart app locally.

*Requirements*: Python 3.8+

1. `git clone https://github.com/citadelid/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

  ```bash
  API_CLIENT_ID=<YOUR CLIENT_ID HERE>
  API_SECRET=<YOUR SECRET KEY MUST BE HERE>
  API_PRODUCT_TYPE=<employment, income or admin>
  ```

5. `make python_local`

After running this command, you should see:
```output
web_1  | ======================================== ENVIRONMENT ======================================== 
web_1  |  https://prod.citadelid.com/v1/ 
web_1  |  {
web_1  |     "X-Access-Secret": "<YOUR SECRET_KEY HERE>",
web_1  |     "X-Access-Client-Id": "<YOUR CLIENT_ID HERE>",
web_1  |     "Content-Type": "application/json;charset=UTF-8"
web_1  | } 
web_1  |  ============================================================================================== 
web_1  | 
web_1  |  * Serving Flask app "server" (lazy loading)
web_1  |  * Environment: development
web_1  |  * Debug mode: on
web_1  |  * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
web_1  |  * Restarting with stat
web_1  |  * Debugger is active!
web_1  |  * Debugger PIN: 593-914-178
```

To access the app, open http://127.0.0.1:5000/ in your browser.

# What happens under the hood

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

## <a id="step-1"></a>1. Front end sends request to back end for `bridge_token`
```javascript
const getBridgeToken = async () => {
  const response = await fetch(apiEnpoint + `getBridgeToken`, {
    method: 'get',
    headers,
  }).then((r) => r.json());
  return response;
}
```
## <a id="step-2"></a>2. Back end sends API request to Citadel for `bridge_token`, sends response to front end
```python
def get_bridge_token(self) -> Any:
    """
    https://docs.citadelid.com/?python#bridge-tokens_create
    :param public_token:
    :return:
    """
    logging.info("CITADEL: Requesting bridge token from https://prod.citadelid.com/v1/bridge-tokens")
    class BridgeTokenRequest(TypedDict):
        product_type: str
        client_name: str
        tracking_info: str
    request_data: BridgeTokenRequest = {
        'product_type': self.PRODUCT_TYPE,
        'client_name': 'Citadel Quickstart',
        'tracking_info': '1337'
    }
    tokens: Any = requests.post(
        self.API_URL + 'bridge-tokens/',
        json=request_data,
        headers=self.API_HEADERS,
    ).json()
    return tokens
```
```python
@app.route('/getBridgeToken', methods=['GET'])
def create_bridge_token():
    """Back end API endpoint to request a bridge token"""
    return api_client.get_bridge_token()
```
## <a id="step-3"></a>3. Front end runs `CitadelBridge.init` with `bridge_token`
```javascript
const bridge = CitadelBridge.init({
  bridgeToken: bridgeToken.bridge_token,
  ...
});
window.bridge = bridge;
```

## <a id="step-4"></a>4. User clicks `Connect` button
## <a id="step-5"></a>5. Front end displays Citadel widget, executes `onLoad` callback function
```javascript
onLoad: function () {
  console.log('loaded');
  successClosing = null
},
```

## <a id="step-6"></a>6. User follows instructions, choses provider, logs in, clicks `Done`
## <a id="step-7"></a>7. Front end executes `onSuccess` callback function, sends request to back end with `public_token`, closes widget
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

## <a id="step-8"></a>8. Back end sends API request to Citadel exchanging `public_token` for `access_token`
```python
def get_access_token(self, public_token: str) -> str:
    """
    https://docs.citadelid.com/?python#exchange-token-flow
    :param public_token:
    :return:
    """
    logging.info("CITADEL: Exchanging a public_token for an access_token from https://prod.citadelid.com/v1/access-tokens")
    logging.info("CITADEL: Public Token - %s", public_token)
    class AccessTokenRequest(TypedDict):
        public_tokens: List[str]
    class AccessTokenResponse(TypedDict):
        access_tokens: List[str]
    request_data: AccessTokenRequest = {
        'public_tokens': [public_token],
    }
    tokens: AccessTokenResponse = requests.post(
        self.API_URL + 'access-tokens/',
        json=request_data,
        headers=self.API_HEADERS,
    ).json()
    return tokens['access_tokens'][0]
```
## <a id="step-9"></a>9. Back end sends API request to Citadel with `access_token` for payroll data
```python
def get_employment_info_by_token(self, access_token: str) -> Any:
    """
    https://docs.citadelid.com/#employment-verification
    :param access_token:
    :return:
    """
    logging.info("CITADEL: Requesting employment verification data using an access_token from https://prod.citadelid.com/v1/verifications/employments")
    logging.info("CITADEL: Access Token - %s", access_token)
    class VerificationRequest(TypedDict):
        access_token: str

    request_data: VerificationRequest = {'access_token': access_token}

    return requests.post(
        self.API_URL + 'verifications/employments/',
        json=request_data,
        headers=self.API_HEADERS,
    ).json()

def get_income_info_by_token(self, access_token: str) -> Any:
    """
    https://docs.citadelid.com/#income-verification
    :param access_token:
    :return:
    """

    logging.info("CITADEL: Requesting income verification data using an access_token from https://prod.citadelid.com/v1/verifications/incomes")
    logging.info("CITADEL: Access Token - %s", access_token)
    class VerificationRequest(TypedDict):
        access_token: str

    request_data: VerificationRequest = {'access_token': access_token}

    return requests.post(
        self.API_URL + 'verifications/incomes/',
        json=request_data,
        headers=self.API_HEADERS,
    ).json()
```
## <a id="step-10"></a>10. Back end sends payroll data back to front end
```python
@app.route('/getVerifications/<public_token>', methods=['GET'])
def get_verification_info_by_token(public_token: str):
    """ Back end API endpoint to retrieve employment or income verification
        data using a front end public_token """

    # First exchange public_token to access_token
    access_token = api_client.get_access_token(public_token)

    # Use access_token to retrieve the data
    if product_type == 'employment':
        verifications = api_client.get_employment_info_by_token(access_token)
    elif product_type == 'income':
        verifications = api_client.get_income_info_by_token(access_token)
    else:
        raise Exception('Unsupported product type!')
    return verifications
```
## <a id="step-11"></a>11. Front end renders the payrol data sent back by back end for user to view
```javascript
function renderPayrollData(data) {
  const historyContainer = document.querySelector("#history")
  historyContainer.innerHTML = JSON.stringify(data, null, 2)
}
```