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
API_URL=https://prod.citadelid.com/v1/
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
  API_URL: 'https://prod.citadelid.com/v1',
  API_PRODUCT_TYPE: <YOUR PRODUCT TYPE HERE>
==============================================================================================
listening on port 5000
```

To access the app, open http://127.0.0.1:5000/ in your browser.

# Run your first verification
## Overview
The Go Quickstart app emulates the experience of an applicant going through a background check/income verification and visiting the applicant portal.

Before using Citadel for verification, an applicant fills out the form. 

To streamline the process and make employment/income verification easy and instant, we "hide" the form behind the button. 

If the verification is successful via Citadel, then we show to the applicant the data that we found in their payroll account. 

If the verification isn't successful or the applicant decided to exit Citadel's widget, the applicant will see the form, fill it out and the verification can be done via an existing verification process.

## Successful verification

After opening the Go Quickstart app running locally, click the `Verify employment`/`Verify income` button, search for a company, (e.g., `Facebook`) and select a provider. 

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
4. [:smiley: clicks `Verify Income`/`Verify Employment` button](#step-4)
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
func getRequest(endpoint string, method string, body []byte) (*http.Request) {
  apiUrl := os.Getenv("API_URL")
  clientId := os.Getenv("API_CLIENT_ID")
  accessKey := os.Getenv("API_SECRET")
  fullEndpoint := fmt.Sprintf("%s%s", apiUrl, endpoint)
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
```
func bridgeToken(w http.ResponseWriter, r *http.Request) {
  bridgeData := getBridgeToken()
  fmt.Fprintf(w, bridgeData)
}
```
## <a id="step-3"></a>3. :computer: runs `CitadelBridge.init` with `bridge_token`
```
  const bridge = CitadelBridge.init({
    clientName: 'Citadel Quickstart',
    bridgeToken: bridgeToken.bridge_token,
    product: 'income',
    trackingInfo: 'any data for tracking current user',
    ...
  });
  window.bridge = bridge;
```
## <a id="step-4"></a>4. :smiley: clicks `Verify Income`/`Verify Employment` button
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
## <a id="step-9"></a>9. :cloud: sends API request to Citadel with `access_token` for employment/income verification
```
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
## <a id="step-10"></a> 10. :cloud: sends employment/income verification information back to :computer:
```
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