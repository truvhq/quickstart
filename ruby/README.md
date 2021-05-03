# Ruby Quickstart

## Introduction

Let's get you started with Citadel by walking through this Ruby on Rails Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.citadelid.com](https://dashboard.citadelid.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

## Set up the Ruby on Rails Quickstart

Once you have your API keys, it's time to run the Citadel Ruby on Rails Quickstart app locally.

*Requirements*: Ruby 2.6.5

1. `git clone https://github.com/citadelid/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

    ```bash
    API_CLIENT_ID=<YOUR CLIENT_ID HERE>
    API_SECRET=<YOUR SECRET KEY MUST BE HERE>
    API_PRODUCT_TYPE=<employment, income or admin>
    ```

5. `make ruby_local`

After running this command, you should see:

```output
* Min threads: 5, max threads: 5
* Environment: development
* Listening on tcp://127.0.0.1:5000
* Listening on tcp://[::1]:5000
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

```ruby
  def self.getBridgeToken()
    return sendRequest('bridge-tokens/', nil, "POST")
  end

  ...

  def self.sendRequest(endpoint, body, method)
    uri = URI("https://prod.citadelid.com/v1/#{endpoint}")
    puts "accessing #{endpoint}".inspect
    if method == "POST"
      req = Net::HTTP::Post.new uri
    else
      req = Net::HTTP::Get.new uri
    end
    req['Content-Type'] = 'application/json'
    req['Accept'] = 'application/json'
    req['X-Access-Client-Id'] = Citadel.client_id
    req['X-Access-Secret'] = Citadel.client_secret
    if body
      req.body = body
    end

    response = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => uri.scheme == 'https') do |http|
      http.request req
    end

    case response
    when Net::HTTPSuccess then
      body = JSON.parse(response.body)
      return body
    else
      puts "ERROR REACHING CITADEL".inspect
      puts response.inspect
      return JSON.parse('{}')
    end
  end
```

```ruby
  get 'getBridgeToken', to: 'bridge_token#get'
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

```ruby
def self.getAccessToken(public_token)
  body = { "public_token" => public_token }.to_json
  return sendRequest('link-access-tokens/', body)["access_token"]
end

...

def self.sendRequest(endpoint, body)
  uri = URI("https://prod.citadelid.com/v1/#{endpoint}")
  req = Net::HTTP::Post.new uri
  req['Content-Type'] = 'application/json'
  req['Accept'] = 'application/json'
  req['X-Access-Client-Id'] = Citadel.client_id
  req['X-Access-Secret'] = Citadel.client_secret
  if body
    req.body = body
  end

  response = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => uri.scheme == 'https') do |http|
    http.request req
  end

  case response
    when Net::HTTPSuccess then
    body = JSON.parse(response.body)
    return body
  else
    puts "ERROR REACHING CITADEL".inspect
    puts response.inspect
    return JSON.parse('{}')
  end
end
```

### <a id="step-9"></a>9. Back end sends API request to Citadel with `access_token` for payroll data

```ruby
def self.getEmploymentInfoByToken(access_token)
  body = { "access_token" => access_token }.to_json
  sendRequest('verifications/employments/', body)
end

def self.getIncomeInfoByToken(access_token)
  body = { "access_token" => access_token }.to_json
  sendRequest('verifications/incomes/', body)
end
```

### <a id="step-10"></a>10. Back end sends payroll data back to front end

```ruby
Rails.application.routes.draw do
  root :to => 'main#index'
  get 'getVerifications/:public_token', to: 'verification#get'
end
```

### <a id="step-11"></a>11. Front end renders the payroll data sent back by back end for user to view

```javascript
function renderPayrollData(data) {
  const historyContainer = document.querySelector("#history")
  historyContainer.innerHTML = JSON.stringify(data, null, 2)
}
```
