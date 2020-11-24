# Introduction
Let's get you started with Citadel by walking through this Quickstart app. You'll need a set of API keys which you can request by emailing team@citadelid.com.

You'll have two different API keys used by the back end, `client_id` and `access_key`.

# Set up the Quickstart

Follow the `README.md` file for the language you would like to implement in. If you don't see the language you are working with, send an email to developer-relations@citadelid.com

- [Python](https://github.com/citadelid/quickstart/blob/master/python/README.md)
- [Node](https://github.com/citadelid/quickstart/blob/master/node/README.md)
- [Ruby on Rails](https://github.com/citadelid/quickstart/blob/master/ruby/README.md)

# Run you first verification
## Overview
The Quickstart app emulates the experience of an applicant going through a background check/income verification and visiting the applicant portal.

Before using Citadel for verification, applicants fill out the form. 

To streamline the process and make employment/income verification easy and instant, we "hide" the form behind the button. 

If the verification is successful via Citadel, then we show to the applicant the data that we found in their payroll account. 

If the verification isn't successful or the applicant decided to exit Citadel's widget, the applicant will see the form, fill it out and the verification can be done via an existing verification process.

## Successful verification

After opening the Quickstart app running locally, click the `Verify employment`/`Verify income` button, search for a company, eg `Facebook` and select any provider. 

Use the Sandbox credentials to simulate a successful login.

```
username: goodlogin
password: goodpassword
```

Once you have entered your credentials and moved to the next screen, you have succesfully done your first verification. 

The API call will be executed and the data will be loaded into the fields on the form.

## No verification

Now click the `Add employer` button, search for a company, eg `Facebook` and select any provider. 

Click exit icon at the top right of the widget and you'll see the empty form.

# What happened under the hood

- :smiley: = User
- :computer: = Front End/Client App
- :cloud: = Back End/Server

Here is the flow that a successful verification process takes in our example. The below code will be shown in Python but each language has it's own
examples in the respective `README.md` files:

1. [:computer: sends request to :cloud: for `bridge_token`](#step-1)
2. [:cloud: sends API request to Citadel for `bridge_token`, sends response to :computer:](#step-2)
3. [:computer: runs `CitadelBridge.init` with `bridge_token`](#step-3)
4. [:smiley: clicks `Verify Income/`Verify Employment` button](#step-4)
5. [:computer: displays Citadel widget, fires `onLoad` function executed](#step-5)
6. [:smiley: selects employer, choses provider, logs in, clicks `Done`](#step-6)
7. [:computer: first onSuccess function, sends request to :cloud: with temporary `token`, closes widget, first `onClose`](#step-7)
8. [:cloud: sends API request to Citadel exchanging temporary `token` for `access_token`](#step-8)
9. [:cloud: sends API request to Citadel with `access_token` for employment/income verification](#step-9)
10. [:cloud: sends employment/income verification information back to :computer:](#step-10)
11. [:computer: renders the verification info sent back by :cloud: for :smiley: to view](#step-11)

## <a id="step-1"></a>1. :computer: sends request to :cloud: for `bridge_token`
```
  const getBridgeToken = async () => {
    const response = await fetch(apiEnpoint + `getBridgeToken`, {
      method: 'get',
      headers,
    }).then((r) => r.json());
    return response;
  }
```
## <a id="step-2"></a>2. :cloud: sends API request to Citadel for `bridge_token`, sends response to :computer:
```
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
```
  @app.route('/getBridgeToken', methods=['GET'])
  def create_bridge_token():
    return api_client.get_bridge_token()
```
## <a id="step-3"></a>3. :computer: runs `CitadelBridge.init` with `bridge_token`
```
  const bridge = CitadelBridge.init({
    clientName: 'Citadel NodeJS Quickstart',
    bridgeToken: bridgeToken.bridge_token,
    product: 'income',
    trackingInfo: 'any data for tracking current user',
    ...
  });
  window.bridge = bridge;
```

## <a id="step-4"></a>4. :smiley: clicks `Verify Income/`Verify Employment` button
## <a id="step-5"></a>5. :computer: displays Citadel widget, fires `onLoad` function executed
```
  onLoad: function () {
    console.log('loaded');
    successClosing = null
  },
```

## <a id="step-6"></a>6. :smiley: selects employer, choses provider, logs in, clicks `Done`
## <a id="step-7"></a>7. :computer: first onSuccess function, sends request to :cloud: with temporary `token`, closes widget, first `onClose`
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

## <a id="step-8"></a>8. :cloud: sends API request to Citadel exchanging temporary `token` for `access_token`
```
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
## <a id="step-9"></a>9. :cloud: sends API request to Citadel with `access_token` for employment/income verification
```
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
## <a id="step-10"></a>10. :cloud: sends employment/income verification information back to :computer:
```
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
## <a id="step-11"></a>11. :computer: renders the verification info sent back by :cloud: for :smiley: to view
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