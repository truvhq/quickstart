# Get started with Quickstart for web
To get started with Truv, we recommend following a step-by-step walkthrough in our docs https://docs.truv.com/docs/quickstart-guide

1. Clone the repository
```shell
git clone https://github.com/truvhq/quickstart.git
```

2. Open `quickstart` directory and create `.env` file:
```shell
cd quickstart
make env
```

3. Update the values in `.env` file by adding in your Client ID and Sandbox Access key:
```
# please set your <Client ID>
API_CLIENT_ID=

# please set your <Access key>
API_SECRET=

# optional: set to false to use Users API instead of Embedded Orders API
IS_ORDER=true
```

**Note about Orders API:** The default flow uses the Orders API, which is best suited for use cases where multiple connections are required from the user. Set `IS_ORDER=false` to use the Users API instead.

4. Run all-in-one docker-compose
```shell
docker-compose up
```

or run specific image
```shell
make [python_docker|ruby_docker|golang_docker|node_docker|csharp_docker]
```

5. Check the quickstart demo for your programming language:
* http://localhost:5001 Python
* http://localhost:5002 Ruby
* http://localhost:5003 Go
* http://localhost:5004 Node.Js
* http://localhost:5005 C#