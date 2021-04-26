# Introduction
Let's get you started with Citadel by walking through this Go Quickstart app. You'll need a set of API keys which you can get by signing up at https://dashboard.citadelid.com

You'll have two different API keys used by the back end, `client_id` and `access_key`.


# Set up the Go Quickstart
Once you have your API keys, it's time to run the Citadel Go Quickstart app locally.
*Requirements*: The latest version of `golang`

1. `git clone https://github.com/citadelid/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):
```
API_SECRET=<YOUR SECRET KEY MUST BE HERE>
API_CLIENT_ID=<YOUR CLIENT_ID HERE>
API_PRODUCT_TYPE=<employment, income or admin>
```
5. `make go_local`

After running this command, you should see:
```
======================================== ENVIRONMENT ========================================
  API_CLIENT_ID: <YOUR CLIENT ID HERE>,
  API_SECRET: <YOUR SECRET KEY HERE>,
  API_PRODUCT_TYPE: <YOUR PRODUCT TYPE HERE>
==============================================================================================
listening on port 5000
```

To access the app, open http://127.0.0.1:5000/ in your browser.

# What happens under the hood

- :smiley: = User
- :computer: = Front End/Client App
- :cloud: = Back End/Server

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
```go
func getRequest(endpoint string, method string, body []byte) (*http.Request) {
  clientId := os.Getenv("API_CLIENT_ID")
  accessKey := os.Getenv("API_SECRET")
  fullEndpoint := fmt.Sprintf("%s%s", "https://prod.citadelid.com/v1/", endpoint)
  request, _ := http.NewRequest(method, fullEndpoint, bytes.NewBuffer(body))
  request.Header.Set("Content-Type", "application/json")
  request.Header.Set("X-Access-Client-Id", clientId)
  request.Header.Set("X-Access-Secret", accessKey)
  return request
}

func getBridgeToken() (string) {
  request := getRequest("bridge-tokens/", "POST", nil)
  client := &http.Client{}
  response, err := client.Do(request)
  if err != nil {
    fmt.Printf("The HTTP request failed with error %s\n", err)
  } else {
    data, _ := ioutil.ReadAll(response.Body)
    return (string(data))
  }
  return ""
}
```
```go
func bridgeToken(w http.ResponseWriter, r *http.Request) {
  bridgeData := getBridgeToken()
  fmt.Fprintf(w, bridgeData)
}
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
```go

type PublicTokenRequest struct {
  PublicTokens []string `json:"public_tokens"`
}

...

type AccessTokenResponse struct {
  AccessTokens []string `json:"access_tokens"`
}

...

func getAccessToken(public_token string) (string) {
  publicTokens := PublicTokenRequest{PublicTokens: []string{public_token}}
  jsonPublicTokens, _ := json.Marshal(publicTokens)
  accessTokens := AccessTokenResponse{}
  request := getRequest("access-tokens/", "POST", jsonPublicTokens)
  client := &http.Client{}
  res, err := client.Do(request)
    defer res.Body.Close()

    if err != nil {
        fmt.Printf("The HTTP request failed with error %s\n", err)
    }
    err = json.NewDecoder(res.Body).Decode(&accessTokens)
    if err != nil {
        panic(err)
    }
    return accessTokens.AccessTokens[0]
}
```
## <a id="step-9"></a>9. Back end sends API request to Citadel with `access_token` for payroll data
```go
type AccessTokenRequest struct {
  AccessToken string `json:"access_token"`
}

...

func getEmploymentInfoByToken(access_token string) (string) {
  accessToken := AccessTokenRequest{AccessToken: access_token}
  jsonAccessToken, _ := json.Marshal(accessToken)
  request := getRequest("verifications/employments", "POST", jsonAccessToken)
  client := &http.Client{}
  res, err := client.Do(request)
    defer res.Body.Close()

    if err != nil {
        fmt.Printf("The HTTP request failed with error %s\n", err)
    }
    data, _ := ioutil.ReadAll(res.Body)
    return string(data)
}

func getIncomeInfoByToken(access_token string) (string) {
  accessToken := AccessTokenRequest{AccessToken: access_token}
  jsonAccessToken, _ := json.Marshal(accessToken)
  request := getRequest("verifications/incomes", "POST", jsonAccessToken)
  client := &http.Client{}
  res, err := client.Do(request)
    defer res.Body.Close()

    if err != nil {
        fmt.Printf("The HTTP request failed with error %s\n", err)
    }
    data, _ := ioutil.ReadAll(res.Body)
    return string(data)
}
```
## <a id="step-10"></a> 10. Back end sends payroll data back to front end
```go
func verifications(w http.ResponseWriter, r *http.Request) {
  productType := os.Getenv("API_PRODUCT_TYPE")
  splitPath := strings.Split(r.URL.Path, "/")
  token := splitPath[2]
  accessToken := getAccessToken(token)
  verificationResponse := ""
  if productType == "employment" {
    verificationResponse = getEmploymentInfoByToken(accessToken)
  } else {
    verificationResponse = getIncomeInfoByToken(accessToken)
  }
  fmt.Fprintf(w, verificationResponse)
}
```
## <a id="step-11"></a>11. Front end renders the payroll data sent back by back end for user to view
```javascript
function renderPayrollData(data) {
  const historyContainer = document.querySelector("#history")
  historyContainer.innerHTML = JSON.stringify(data, null, 2)
}
```