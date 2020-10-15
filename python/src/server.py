import json
import os

import flask
from flask import Flask, render_template
from flask_cors import CORS

from .naive_api_client import NaiveApiClient

app = Flask(__name__)
CORS(app)

public_key = os.environ.get('API_PUBLIC_KEY')
secret = os.environ.get('API_SECRET')
client_id = os.environ.get('API_CLIENT_ID')

api_client = NaiveApiClient(
    api_url=os.environ.get('API_URL', 'https://prod.citadelid.com/v1/'),
    secret=secret,
    client_id=client_id,
)

if not secret or not client_id or not public_key:
    raise Exception("Environment MUST contains 'API_SECRET' and 'API_CLIENT_ID'")

print("=" * 40, "ENVIRONMENT", "=" * 40, "\n",
      api_client.API_URL, "\n",
      "API_PUBLIC_KEY", public_key, "\n",
      json.dumps(api_client.API_HEADERS, indent=4), "\n",
      "=" * 94, "\n", )


@app.context_processor
def inject_public_key():
    return dict(public_key=public_key, )


@app.route('/')
def index():
    """Just render example with bridge.js"""
    return render_template('index.html')


@app.route('/createAccessToken', methods=['POST'])
def create_access_token():
    """Handler to exchange public_key from widget check with access_token"""
    json_data = flask.request.json

    return {
        'access_token': api_client.get_access_token(
            public_token=json_data.get('public_token'))
    }


@app.route('/getVerifications/<access_token>', methods=['GET'])
def get_verification_info_by_token(access_token: str):
    """ getVerificationInfoByToken """
    verifications = api_client.get_verification_info_by_token(access_token)
    return verifications


if __name__ == '__main__':
    app.debug = True
    app.run()
