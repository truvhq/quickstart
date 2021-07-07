import json
import os
import time
import logging
import hashlib
import hmac

import flask
from flask import Flask, render_template, request
from flask_cors import CORS

from .naive_api_client import NaiveApiClient

logging.basicConfig(level=logging.INFO)

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
template_dir = os.path.abspath('./html')
app = Flask(__name__, template_folder=template_dir)
CORS(app)

secret = os.environ.get('API_SECRET')
client_id = os.environ.get('API_CLIENT_ID')
product_type = os.environ.get('API_PRODUCT_TYPE', 'employment')

access_token = None

api_client = NaiveApiClient(
    secret=secret,
    client_id=client_id,
    product_type=product_type,
)

if not secret or not client_id:
    raise Exception("Environment MUST contains 'API_SECRET' and 'API_CLIENT_ID'")

print("=" * 40, "ENVIRONMENT", "=" * 40, "\n",
      json.dumps(api_client.API_HEADERS, indent=4), "\n",
      "=" * 94, "\n", )


@app.context_processor
def inject_product_type():
    return dict(
        server_url=flask.request.url_root,
    )


@app.route('/')
def index():
    """Just render example with bridge.js"""
    if product_type == 'income':
        return render_template('income.html')
    elif product_type == 'admin':
        return render_template('admin.html')
    elif product_type == 'fas':
        return render_template('fas.html')
    elif product_type == 'deposit_switch':
        return render_template('deposit_switch.html')
    else:
        return render_template('employment.html')

@app.route('/getBridgeToken', methods=['GET'])
def create_bridge_token():
    """Back end API endpoint to request a bridge token"""
    return api_client.get_bridge_token()

def generate_webhook_sign(payload: str, key: str) -> str:
    generated_hash = hmac.new(
        key=key.encode('utf-8'),
        msg=payload.encode('utf-8'),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return f'v1={generated_hash}'

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = generate_webhook_sign(request.data.decode('UTF-8'), secret)
    logging.info("CITADEL: Webhook received")
    logging.info("CITADEL: Event type:      %s", request.json["event_type"])
    logging.info("CITADEL: Status:          %s", request.json["status"])
    logging.info("CITADEL: Signature match: %s\n", request.headers["X-WEBHOOK-SIGN"] == signature)
    return ""


@app.route('/getVerifications/<public_token>', methods=['GET'])
def get_verification_info_by_token(public_token: str):
    """ Back end API endpoint to retrieve employment or income verification
        data using a front end public_token """

    global access_token
    # First exchange public_token to access_token
    tokenResult = api_client.get_access_token(public_token)
    access_token = tokenResult["access_token"]

    # Use access_token to retrieve the data
    if product_type == 'employment':
        verifications = api_client.get_employment_info_by_token(access_token)
    elif product_type == 'income':
        verifications = api_client.get_income_info_by_token(access_token)
    else:
        raise Exception('Unsupported product type!')
    return verifications

@app.route('/createRefreshTask', methods=['GET'])
def create_refresh_task_by_token():
    """ Back end API endpoint to create a refresh task
        from an existing access token """

    global access_token
    # Create a refresh task
    task_id = api_client.create_refresh_task(access_token)['task_id']

    # Check the status of a refresh task
    refreshTask = api_client.get_refresh_task(task_id)
    finishedStatuses = ["done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"]
    
    while refreshTask['status'] not in finishedStatuses:
        logging.info("CITADEL: Refresh task is not finished. Waiting 2 seconds, then checking again.")
        time.sleep(5)
        refreshTask = api_client.get_refresh_task(task_id)

    logging.info("CITADEL: Refresh task is finished. Pulling the latest data.")

    data = None

    # When the refresh status is complete we can get the latest info
    if product_type == 'employment':
        data = api_client.get_employment_info_by_token(access_token)
    elif product_type == 'income':
        data = api_client.get_income_info_by_token(access_token)

    return data

@app.route('/getDepositSwitchData/<public_token>', methods=['GET'])
def get_deposit_switch_data_by_token(public_token: str):
    """ Back end API endpoint to retrieve direct deposit switch
        data using a front end public_token """

    # First exchange public_token to access_token
    tokenResult = api_client.get_access_token(public_token)
    access_token = tokenResult["access_token"]

    # Use access_token to retrieve the data
    depositSwitch = api_client.get_deposit_switch_by_token(access_token)

    return depositSwitch

@app.route('/startFundingSwitchFlow/<public_token>', methods=['GET'])
def start_funding_switch_flow_by_token(public_token: str):
    """ Back end API endpoint to create a refresh task for funding switch flow using a front
        end public_token """
    global access_token
    # First exchange public_token to access_token
    tokenResult = api_client.get_access_token(public_token)
    access_token = tokenResult["access_token"]

    fundingSwitchResult = api_client.get_funding_switch_status_by_token(access_token)

    return fundingSwitchResult

@app.route('/completeFundingSwitchFlow/<first_micro>/<second_micro>', methods=['GET'])
def complete_funding_switch_flow_by_micro_deposits(first_micro: float, second_micro: float):
    """ Back end API endpoint to create a refresh task for funding switch flow using a front
        end public_token """
    global access_token
    # Use access_token to retrieve the data
    refreshResult = api_client.complete_funding_switch_flow_by_token(access_token, float(first_micro), float(second_micro))

    return refreshResult

@app.route('/getAdminData/<public_token>', methods=['GET'])
def get_admin_data_by_token(public_token: str):
    """ Back end API endpoint to retrieve payroll admin data
        using a front end public_token """

    # First, exchange public_token to access_token
    tokenResult = api_client.get_access_token(public_token)
    access_token = tokenResult["access_token"]

    # Second, request employee directory
    directory = api_client.get_employee_directory_by_token(access_token)

    # Third, create request for payroll report
    report_id = api_client.request_payroll_report(access_token, '2020-01-01', '2020-02-01')['payroll_report_id']

    # Last, collect prepared payroll report
    payroll = api_client.get_payroll_report_by_id(report_id)
    if payroll['status'] != 'done':
        logging.info("CITADEL: Report not complete. Waiting and trying again")
        time.sleep(5)
        payroll = api_client.get_payroll_report_by_id(report_id)

    return {
        'directory': directory,
        'payroll': payroll
    }

print("Quickstart Loaded. Navigate to http://localhost:5000 to view Quickstart.", )

if __name__ == '__main__':
    app.debug = True
    app.run()
    