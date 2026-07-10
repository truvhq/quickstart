# Python Quickstart

## Introduction

Let's get you started with Truv by walking through this Python Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.truv.com](https://dashboard.truv.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

Full documentation is available at [https://docs.truv.com/developers/quickstart](https://docs.truv.com/developers/quickstart)

## Requirements

Python 3.8+

## Set up the Python Quickstart

Once you have your API keys, it's time to run the Truv Python Quickstart app locally.

1. `git clone https://github.com/truvhq/quickstart`
2. `cd quickstart`
3. `make env`
4. Update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

    ```bash
    API_CLIENT_ID=<YOUR CLIENT_ID HERE>
    API_SECRET=<YOUR SECRET KEY MUST BE HERE>
    API_PRODUCT_TYPE=<employment, income, deposit_switch or pll>
    IS_ORDER=<true or false - optional, defaults to true>
    ```

    **Note:** The default flow uses the [Orders API](https://docs.truv.com/developers/integration/embedded-orders/overview) for `income` and `employment` products, designed for home lending and social services use cases where multiple employer connections are expected. Set `IS_ORDER=false` for a single connection flow. The `deposit_switch` and `pll` products always use the single connection flow.

5. `make python_local`

   After running this command, you should see:

    ```output
    * Serving Flask app "server" (lazy loading)
    * Environment: development
    * Debug mode: on
    ======================================== ENVIRONMENT ========================================
    {
        "X-Access-Secret": "<YOUR SECRET_KEY HERE>",
        "X-Access-Client-Id": "<YOUR CLIENT_ID HERE>",
        "Content-Type": "application/json;charset=UTF-8"
    }
    ==============================================================================================

    Quickstart Loaded. Navigate to http://localhost:5001 to view Quickstart.
    ```

    To access the app, open [http://127.0.0.1:5001/](http://127.0.0.1:5001/) in your browser.

    Since Apple released MacOS Monterey, we changed the default Flask port to `5001`, to prevent conflict with AirPlay Receiver. More information
    on this issue could be found [here](https://stackoverflow.com/questions/69818376/localhost5000-unavailable-in-macos-v12-monterey/).

    But you can redefine this behavior by adding `FLASK_RUN_PORT=<custom port number>` to `.env` file.
