# Introduction
Let's get you started with Citadel by walking through this Quickstart app. You'll need a set of API keys which you can request via email team@citadelid.com.

You'll have two different API keys (`client_id` and `access_key`), and we'll start in the Sandbox environment. 


# Set up the Quickstart
Once you have your API keys, it's time to run the Citadel Quickstart app locally.
You have two options - running with `docker` and `docker-compose` or starting with python and virtual env

## Quickstart with docker/docker-compose
*Requirements*: `docker` and `docker-compose` are available.

-  git clone https://github.com/citadelid/quickstart
-  cd quickstart
-  make env

After you have to write your `SECRET_KEY` and `CLIENT_ID` to the `.env` file.

Content of `.env` have to look like 
```
API_URL=https://prod.citadelid.com/v1/
API_PUBLIC_KEY=<YOUR PUBLIC KEY HERE>
API_SECRET=<YOUR SECRET KEY MUST BE HERE>
API_CLIENT_ID=<YOUR CLIENT_ID HERE>
```

- make python_docker

you have to see something like that if you
```
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

open http://127.0.0.1:5000/ in browser


## Quickstart with only python and virtual env
*Requirements*: `python --version` must print into console something like`Python 3.8.X`
if you have an alias for python of 3.8 you must 


- git clone https://github.com/citadelid/quickstart
- cd quickstart
- make env

After you have to write your `SECRET_KEY` and `CLIENT_ID` to the `.env` file.

Content of `.env` have to look like 
```
API_URL=https://prod.citadelid.com/v1/
API_PUBLIC_KEY=<YOUR PUBLIC KEY HERE>
API_SECRET=<YOUR SECRET KEY MUST BE HERE>
API_CLIENT_ID=<YOUR CLIENT_ID HERE>
```

- make python_venv

```
======================================== ENVIRONMENT ======================================== 
 https://prod.citadelid.com/v1/ 
 {
    "X-Access-Secret": "sandbox-a6908e6a533605baddd8d8a9d9fda6cf31aa3e0a",
    "X-Access-Client-Id": "d2f856c7d0b845129feaa8e955462779",
    "Content-Type": "application/json;charset=UTF-8"
} 
 ============================================================================================== 

 * Tip: There are .env or .flaskenv files present. Do "pip install python-dotenv" to use them.
 * Serving Flask app "server" (lazy loading)
 * Environment: production
   WARNING: This is a development server. Do not use it in a production deployment.
   Use a production WSGI server instead.
 * Debug mode: off
 * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
```

# Run you first verification
## Overview
Quickstart app emulates the experience of an applicant going through a background check and visiting the applicant portal.

Before using Citadel for verification, applicants filled out the form. To streamline the process and make employment verification easy and instant, we "hide" the form behind the button. 

If the verification is successful via Citadel, then we will show to the applicant the data that we found in their payroll account. 

If the verification is not successful or the applicant decided to exit Citadel's widget, the applicant will see the form, fill it out and the verification can be done via an existing verification process.

## Successful verification

After opening the Quickstart app running locally, click the `Verify employment` button, search for a company, eg `Facebook` and select any provider. 

Use the Sandbox credentials to simulate a successful login.

```
username: goodlogin
password: goodpassword
```

Once you have entered your credentials and moved to the next screen, you have succesfully done your first verification. 

The API call will be done and the data will be loaded into the fields of the form.

## No verification

Now click `Add employer` button, search for a company, eg `Facebook` and select any provider. 

Click exit icon at the top right of the widget and you'll see the empty form.

# What happened under the hood
## Token exchange flow



## API call





