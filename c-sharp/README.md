# C# Quickstart

## Introduction

Let's get you started with Truv by walking through this C# Quickstart app. You'll need a set of API keys which you can get by signing up at [https://dashboard.truv.com](https://dashboard.truv.com)

You'll have two different API keys used by the back end, `Client ID` and `Access key`.

Full documentation is available at [https://docs.truv.com/docs/quickstart-guide](https://docs.truv.com/docs/quickstart-guide)

## Requirements

.NET Core 6.0, .NET SDK 6.0

## Set up the C# Quickstart

Once you have your API keys, it's time to run the Truv C# Quickstart app locally.

1. `git clone https://github.com/truvhq/quickstart`
2. `cd quickstart`
3. `make env`
4. Update the `.env` file in the root of the project. The contents of the `.env` has to look like this (values with <> should be replaced by the proper keys or values):

    ```bash
    API_CLIENT_ID=<YOUR CLIENT_ID HERE>
    API_SECRET=<YOUR SECRET KEY MUST BE HERE>
    API_PRODUCT_TYPE=<employment, income, admin, deposit_switch or fas>
    IS_ORDER=<true or false - optional, defaults to false>
    ```

    **Note:** Set `IS_ORDER=true` to use the Orders API instead of the Users API for creating bridge tokens. This is useful for certain integration patterns where you want to pre-configure employer and account information.

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
