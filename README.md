# Get started with Quickstart for web
To get started with Citadel API, we recommend following a step-by-step walkthrough in our docs https://docs.citadelid.com/docs/web-quickstart.

or run all-in-one docker-compose
```shell
cd quickstart
make env
docker-compose up -d
```

or run specific image  
```shell
cd quickstart
make env
make [python_docker|ruby_docker|go_docker|node_docker|csharp_docker]
```

Check the quickstart demo for your programming language:
1. http://localhost:5001 Python
2. http://localhost:5002 Ruby
3. http://localhost:5003 Go
4. http://localhost:5004 Node.Js
5. http://localhost:5005 C#

