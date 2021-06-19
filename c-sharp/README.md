# Go Quickstart

## Introduction

Let's get you started with Citadel by walking through this C# Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.citadelid.com](https://dashboard.citadelid.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

## Set up the C# Quickstart

Once you have your API keys, it's time to run the Citadel C# Quickstart app locally.
*Requirements*: .NET Core 5.0, .NET SDK 5.0

1. `git clone https://github.com/citadelid/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

    ```bash
    API_CLIENT_ID=<YOUR CLIENT_ID HERE>
    API_SECRET=<YOUR SECRET KEY MUST BE HERE>
    API_PRODUCT_TYPE=<employment, income, admin-directory, admin-report, deposit_switch or fas>
    ```

5. `make csharp_local`

After running this command, you should see:

```output
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
```

To access the app, open `http://127.0.0.1:5000/` in your browser.

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

```c#
public Citadel() {
  client = new HttpClient();
  client.DefaultRequestHeaders.Add("X-Access-Client-Id", clientId);
  client.DefaultRequestHeaders.Add("X-Access-Secret", clientSecret);
}

public async Task<string> SendRequest(string endpoint, string content = "", string method = "POST") {
  var request = new HttpRequestMessage {
    RequestUri = new Uri("https://prod.citadelid.com/v1/" + endpoint),
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

```c#
public async Task<string> GetAccessToken(string publicToken) {
  var response = await SendRequest("link-access-tokens/", "{\"public_tokens\": \"" + publicToken + "\" }");
  var parsedResponse = JsonDocument.Parse(response);
  return parsedResponse.RootElement.GetProperty("access_token").GetString();
}
```

### <a id="step-9"></a>9. Back end sends API request to Citadel with `access_token` for payroll data

```c#
public async Task<string>GetEmploymentInfoByToken(string accessToken) {
  return await SendRequest("verifications/employments/", "{\"access_token\": \"" + accessToken + "\" }");
}


...

public async Task<string>GetIncomeInfoByToken(string accessToken) {
  return await SendRequest("verifications/incomes/", "{\"access_token\": \"" + accessToken + "\" }");
}
```

### <a id="step-10"></a> 10. Back end sends payroll data back to front end

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

### <a id="step-11"></a>11. Front end renders the payroll data sent back by back end for user to view

```javascript
function renderPayrollData(data) {
  const historyContainer = document.querySelector("#history")
  historyContainer.innerHTML = JSON.stringify(data, null, 2)
}
```
