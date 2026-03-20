# Ruby Quickstart

## Introduction

Let's get you started with Truv by walking through this Ruby on Rails Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.truv.com](https://dashboard.truv.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

Full documentation is available at [https://docs.truv.com/docs/quickstart-guide](https://docs.truv.com/docs/quickstart-guide)


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
    API_PRODUCT_TYPE=<employment, income, admin, deposit_switch or fas>
    IS_ORDER=<true or false - optional, defaults to false>
    ```

    **Note:** Set `IS_ORDER=true` to use the Orders API instead of the Users API for creating bridge tokens. This is useful for certain integration patterns where you want to pre-configure employer and account information.

5. `make ruby_local`

    After running this command, you should see:

    ```output
    * Min threads: 5, max threads: 5
    * Environment: development
    * Listening on tcp://127.0.0.1:5002
    * Listening on tcp://[::1]:5002
    ```

    To access the app, open [http://127.0.0.1:5002/](http://127.0.0.1:5002/) in your browser.