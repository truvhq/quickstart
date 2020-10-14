# Quickstart with docker/docker-compose
*prerequirements*: `docker` and `docker-compose` available

-  git clone https://github.com/citadelid/quickstart
-  cd quickstart
-  make env

After you have to write your `SECRET_KEY` and `CLIENT_ID` to the `.env` file.

Content of `.env` have to look like 
```
API_URL=https://prod.citadelid.com/v1/
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


# Quickstart with only python and virtual env
*prerequirements*: `python --version` must print into console something like`Python 3.8.X`
if you have an alias for python of 3.8 you must 


- git clone https://github.com/citadelid/quickstart
- cd quickstart
- make env

After you have to write your `SECRET_KEY` and `CLIENT_ID` to the `.env` file.

Content of `.env` have to look like 
```
API_URL=https://prod.citadelid.com/v1/
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