# Introduction
Let's get you started with Citadel by walking through this C# Quickstart app. You'll need a set of API keys which you can request via email team@citadelid.com.

You'll have two different API keys used by the back end, `client_id` and `access_key`.


# Set up the C# Quickstart
Once you have your API keys, it's time to run the Citadel C# Quickstart app locally.
*Requirements*: .NET Core 5.0, .NET SDK 5.0

1. `git clone https://github.com/citadelid/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):
```
API_URL=https://prod.citadelid.com/v1/
API_SECRET=<YOUR SECRET KEY MUST BE HERE>
API_CLIENT_ID=<YOUR CLIENT_ID HERE>
API_PRODUCT_TYPE=<employment, income or admin>
```
5. `make csharp_local`

After running this command, you should see:
```
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
```

To access the app, open http://127.0.0.1:5000/ in your browser.

# Run your first verification
## Overview
The C# Quickstart app emulates the experience of an applicant going through a background check/income verification and visiting the applicant portal.

Before using Citadel for verification, an applicant fills out the form. 

To streamline the process and make employment/income verification easy and instant, we "hide" the form behind the button. 

If the verification is successful via Citadel, then we show to the applicant the data that we found in their payroll account. 

If the verification isn't successful or the applicant decided to exit Citadel's widget, the applicant will see the form, fill it out and the verification can be done via an existing verification process.

## Successful verification

After opening the C# Quickstart app running locally, click the `Verify employment`/`Verify income` button, search for a company, (e.g., `Facebook`) and select a provider.

Use the Sandbox credentials to simulate a successful login.

```
username: goodlogin
password: goodpassword
```

Once you have entered your credentials and moved to the next screen, you have succesfully done your first verification. 

The API call will be executed and the data will be loaded into the form.

## No verification

Now click `Add employer` button, search for a company, eg `Facebook` and select any provider. 

Click the exit icon at the top right of the widget and you'll see the empty form.

# What happened under the hood

- :smiley: = User
- :computer: = Front End/Client App
- :cloud: = Back End/Server

Here is the flow that a successful verification process takes in our example:

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

```javascript
  const getBridgeToken = async () => {
    const response = await fetch(apiEnpoint + `getBridgeToken`, {
      method: 'get',
      headers,
    }).then((r) => r.json());
    return response;
  }
```

## <a id="step-2"></a>2. :cloud: sends API request to Citadel for `bridge_token`, sends response to :computer:

```c#
public Citadel() {
  client = new HttpClient();
  client.DefaultRequestHeaders.Add("X-Access-Client-Id", clientId);
  client.DefaultRequestHeaders.Add("X-Access-Secret", clientSecret);
}

public async Task<string> SendRequest(string endpoint, string content = "", string method = "POST") {
  var request = new HttpRequestMessage {
    RequestUri = new Uri(apiUrl + endpoint),
    Method = method == "POST" ? HttpMethod.Post : HttpMethod.Get,
    Content = new StringContent(content, Encoding.UTF8, "application/json"),
  };
  var response = await client.SendAsync(request);
  return await response.Content.ReadAsStringAsync();
}

public async Task<string> GetBridgeToken() {
  return await SendRequest("bridge-tokens/");
}
```

```c#
[ApiController]
[Route("getBridgeToken")]
public class BridgeTokenController : ControllerBase
{

  private Citadel _citadel = new Citadel();

  [HttpGet]
  public async Task<string> Get()
  {
    return await _citadel.GetBridgeToken();
  }
}
```

## <a id="step-3"></a>3. :computer: runs `CitadelBridge.init` with `bridge_token`

```javascript
  const bridge = CitadelBridge.init({
    clientName: 'Citadel Quickstart',
    bridgeToken: bridgeToken.bridge_token,
    product: 'income',
    trackingInfo: 'any data for tracking current user',
    ...
  });
  window.bridge = bridge;
```

## <a id="step-4"></a>4. :smiley: clicks `Verify Income/`Verify Employment` button

## <a id="step-5"></a>5. :computer: displays Citadel widget, fires `onLoad` function executed

```javascript
  onLoad: function () {
    console.log('loaded');
    successClosing = null
  },
```

## <a id="step-6"></a>6. :smiley: selects employer, choses provider, logs in, clicks `Done`

## <a id="step-7"></a>7. :computer: first onSuccess function, sends request to :cloud: with temporary `token`, closes widget, first `onClose`

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

```c#
public async Task<string> GetAccessToken(string publicToken) {
  var response = await SendRequest("access-tokens/", "{\"public_tokens\": [\"" + publicToken + "\"] }");
  var parsedResponse = JsonDocument.Parse(response);
  return parsedResponse.RootElement.GetProperty("access_tokens").EnumerateArray().First().GetString();
}
```

## <a id="step-9"></a>9. :cloud: sends API request to Citadel with `access_token` for employment/income verification

```c#
public async Task<string>GetEmploymentInfoByToken(string accessToken) {
  return await SendRequest("verifications/employments/", "{\"access_token\": \"" + accessToken + "\" }");
}


...

public async Task<string>GetIncomeInfoByToken(string accessToken) {
  return await SendRequest("verifications/incomes/", "{\"access_token\": \"" + accessToken + "\" }");
}
```

## <a id="step-10"></a> 10. :cloud: sends employment/income verification information back to :computer:

```c#
[ApiController]
[Route("getVerifications")]
public class VerificationController : ControllerBase
{

    private Citadel _citadel = new Citadel();
    private string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
        var accessToken = await _citadel.GetAccessToken(token);
        if(_productType == "employment") {
            return await _citadel.GetEmploymentInfoByToken(accessToken);
        } else {
            return await _citadel.GetIncomeInfoByToken(accessToken);
        }
    }
}
```

## <a id="step-11"></a>11. :computer: renders the verification info sent back by :cloud: for :smiley: to view

```javascript
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
