import hashlib
import hmac
import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import flask
from dotenv import load_dotenv
from flask import Flask, render_template, request
from flask_cors import CORS

from .truv import TruvClient

logging.basicConfig(level=logging.INFO)
load_dotenv()

app = Flask(
    __name__,
    template_folder=Path(__file__).resolve(strict=True).parent.parent.parent / "html",
)
CORS(app)

secret = os.environ.get("API_SECRET")
client_id = os.environ.get("API_CLIENT_ID")
product_type = os.environ.get("API_PRODUCT_TYPE", "income")
flask_port = os.environ.get("FLASK_RUN_PORT", 5001)
_is_order_env = os.environ.get("IS_ORDER", "").strip()
is_order = _is_order_env == "" or _is_order_env.lower() == "true"

if not secret or not client_id:
    raise Exception("Environment MUST contains 'API_SECRET' and 'API_CLIENT_ID'")


api_client = TruvClient(
    secret=secret,
    client_id=client_id,
    product_type=product_type,
)

logging.info("ENVIRONMENT: %s \n", json.dumps(api_client.headers, indent=4))


token = None


def get_token() -> Optional[dict]:
    global token
    return token


def save_token(value):
    global token
    token = value
    return token


@app.context_processor
def inject_product_type():
    return dict(
        server_url=flask.request.url_root,
    )


@app.route("/")
def index():
    """
    Render bridge.js
    """
    # Orders are only supported for income and employment
    order_products = ["income", "employment"]
    use_order = is_order and product_type in order_products
    prefix = "" if use_order else "single-connection/"

    if product_type == "income":
        return render_template(f"{prefix}income.html")

    elif product_type == "deposit_switch":
        return render_template("single-connection/deposit_switch.html")

    elif product_type == "pll":
        return render_template("single-connection/pll.html")

    else:
        return render_template(f"{prefix}employment.html")


@app.route("/getBridgeToken", methods=["GET"])
def create_bridge_token():
    """
    API endpoint to request a bridge token
    """
    order_products = ["income", "employment"]
    if is_order and product_type in order_products:
        return api_client.create_order()

    user = api_client.create_user()
    return api_client.create_user_bridge_token(user_id=user["id"])


def generate_webhook_sign(payload: str, key: str) -> str:
    """
    Generate a webhook signature
    """
    generated_hash = hmac.new(
        key=key.encode("utf-8"),
        msg=payload.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return f"v1={generated_hash}"


@app.route("/webhook", methods=["POST"])
def webhook():
    """
    API Endpoint to receive webhook events from Truv.
    In production, listen for "order-status-updated" with status "completed"
    to know when order data is ready to pull via GET /orders/{order_id}.
    This quickstart only logs events for demonstration purposes.
    """
    signature = generate_webhook_sign(request.data.decode("UTF-8"), secret)
    logging.info("TRUV: Webhook received")
    logging.info(
        "TRUV: Signature match: %s", request.headers["X-WEBHOOK-SIGN"] == signature
    )
    data = request.json
    logging.info("TRUV: Event type:      %s", data.get("event_type"))
    if "status" not in data:
        logging.info("TRUV: No status, skipping\n")
        return ""
    logging.info("TRUV: Status:          %s\n", data.get("status"))
    return ""


@app.route("/getOrderData/<order_id>", methods=["GET"])
def get_order_data(order_id: str):
    """
    API endpoint to retrieve order data by order ID
    """
    return api_client.get_order(order_id)


@app.route("/getVerifications/<public_token>", methods=["GET"])
def get_verification_info_by_token(public_token: str):
    """
    API endpoint to retrieve employment or income verification data
    """
    # First exchange public_token to access_token
    tokenResult = api_client.get_access_token(public_token)
    link_token = save_token(tokenResult)

    # Use link_id to retrieve the report data
    if product_type in ["employment", "income"]:
        return api_client.get_link_report(link_token["link_id"], product_type)

    raise ValueError("Unsupported product type!")


@app.route("/createRefreshTask", methods=["GET"])
def create_refresh_task_by_token():
    """
    API endpoint to create a refresh task from an existing access token
    """
    link_token = get_token()
    if not link_token:
        raise ValueError("No link token data found")

    # Create a refresh task
    task_id = api_client.create_refresh_task(link_token["access_token"])["task_id"]

    # Check the status of a refresh task
    refreshTask = api_client.get_refresh_task(task_id)
    finishedStatuses = [
        "done",
        "login_error",
        "mfa_error",
        "config_error",
        "account_locked",
        "no_data",
        "unavailable",
        "error",
    ]

    while refreshTask["status"] not in finishedStatuses:
        logging.info(
            "TRUV: Refresh task is not finished. Waiting 2 seconds, then checking again."
        )
        time.sleep(2)
        refreshTask = api_client.get_refresh_task(task_id)

    logging.info("TRUV: Refresh task is finished. Pulling the latest data.")

    # When the refresh status is complete we can get the latest info
    if product_type in ["employment", "income"]:
        return api_client.get_link_report(link_token["link_id"], product_type)

    raise ValueError("Unsupported product type!")


@app.route("/getDepositSwitchData/<public_token>", methods=["GET"])
def get_deposit_switch_data_by_token(public_token: str):
    """
    API endpoint to retrieve direct deposit switch data
    """
    tokenResult = api_client.get_access_token(public_token)
    return api_client.get_link_report(tokenResult["link_id"], "direct_deposit")


@app.route("/getPaycheckLinkedLoanData/<public_token>", methods=["GET"])
def get_pll_data_by_token(public_token: str):
    """
    API endpoint to retrieve paycheck linked loan data
    """
    tokenResult = api_client.get_access_token(public_token)
    return api_client.get_link_report(tokenResult["link_id"], "pll")


if __name__ == "__main__":
    app.debug = True
    app.run(port=flask_port)

    logging.info(
        "Quickstart Loaded. Navigate to http://localhost:%s to view.", flask_port
    )
