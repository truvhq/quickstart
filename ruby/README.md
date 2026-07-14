# Ruby Quickstart

## Introduction

Let's get you started with Truv by walking through this Ruby on Rails Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.truv.com](https://dashboard.truv.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

Full documentation is available at [https://docs.truv.com/developers/quickstart](https://docs.truv.com/developers/quickstart)


## Requirements

Ruby 2.7.7

## Set up the Ruby on Rails Quickstart

Once you have your API keys, it's time to run the Truv Ruby on Rails Quickstart app locally.

1. `git clone https://github.com/truvhq/quickstart`
2. `cd quickstart`
3. `make env`
4. update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

    ```bash
    API_CLIENT_ID=<YOUR CLIENT_ID HERE>
    API_SECRET=<YOUR SECRET KEY MUST BE HERE>
    API_PRODUCT_TYPE=<employment, income, deposit_switch or pll>
    IS_ORDER=<true or false - optional, defaults to true>
    ```

    **Note:** The default flow uses the [Orders API](https://docs.truv.com/developers/integration/embedded-orders/overview) for `income` and `employment` products, designed for home lending and social services use cases where multiple employer connections are expected. Set `IS_ORDER=false` for a single connection flow. The `deposit_switch` and `pll` products always use the single connection flow.

5. `make ruby_local`

    After running this command, you should see:

    ```output
    * Min threads: 5, max threads: 5
    * Environment: development
    * Listening on tcp://127.0.0.1:5002
    * Listening on tcp://[::1]:5002
    ```

    To access the app, open [http://127.0.0.1:5002/](http://127.0.0.1:5002/) in your browser.