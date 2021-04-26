# Introduction
Let's get you started with Citadel by walking through this Quickstart app. You'll need a set of API keys which you can get by signing up at https://dashboard.citadelid.com/signup

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

# Set up the Quickstart

Follow the `README.md` file for the language you would like to implement in. If you don't see the language you are working with, send an email to developer-relations@citadelid.com

- [C#](https://github.com/citadelid/quickstart/blob/master/c-sharp/README.md)
- [Go](https://github.com/citadelid/quickstart/blob/master/golang/README.md)
- [Python](https://github.com/citadelid/quickstart/blob/master/python/README.md)
- [Node](https://github.com/citadelid/quickstart/blob/master/node/README.md)
- [Ruby on Rails](https://github.com/citadelid/quickstart/blob/master/ruby/README.md)

# What happens under the hood

Here is the flow that a successful payroll connection process takes in our example. The below code will be shown in Python but each language has it's own
examples in the respective `README.md` files:

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
[Admin](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/html/admin.html#L165) |
[Employment](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/html/employment.html#L144) |
[Income](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/html/income.html#L144) |
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
[C#](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/c-sharp/Citadel.cs#L42) |
[Go](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/golang/citadel.go#L52) |
[NodeJS](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/node/src/citadel.js#L23) |
[Python](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/python/src/naive_api_client.py#L37) |
[Ruby](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/ruby/app/models/Citadel.rb#L10)
```python
  def get_bridge_token(self) -> Any:
    """
    https://docs.citadelid.com/?python#bridge-tokens_create
    :param public_token:
    :return:
    """
    tokens: Any = requests.post(
        self.API_URL + 'bridge-tokens/',
        headers=self.API_HEADERS,
    ).json()
    return tokens
```
[C#](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/c-sharp/Controllers/BridgeTokenController.cs#L10) |
[Go](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/golang/main.go#L31) |
[NodeJS](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/node/src/index.js#L33) |
[Python](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/python/src/server.py#L67) |
[Ruby](https://github.com/citadelid/quickstart/blob/d95e781d928cc38f79186b1e05dc7d96acf7a8b9/ruby/config/routes.rb#L5)
```python
  @app.route('/getBridgeToken', methods=['GET'])
  def create_bridge_token():
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
    """ getVerificationInfoByToken """

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
## <a id="step-11"></a>11. Front end renders the payroll data sent back by back end for user to view
```javascript
function renderPayrollData(data) {
  const historyContainer = document.querySelector("#history")
  historyContainer.innerHTML = JSON.stringify(data, null, 2)
}
```