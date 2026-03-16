import hashlib
import hmac
import json
import logging
import os
import time
from pathlib import Path

import flask
from dotenv import load_dotenv
from flask import Flask, Response, render_template, request, jsonify
from flask_cors import CORS

from .truv import TruvClient
from . import db
from . import api_logger

logging.basicConfig(level=logging.INFO)
load_dotenv()

app = Flask(
    __name__,
    template_folder=Path(__file__).resolve(strict=True).parent.parent.parent / "html",
)
CORS(app)

secret = os.environ.get("API_SECRET")
client_id = os.environ.get("API_CLIENT_ID")
product_type = os.environ.get("API_PRODUCT_TYPE", "employment")
flask_port = os.environ.get("FLASK_RUN_PORT", 5001)
# Legacy flag — still supported for backward compat
is_order = os.environ.get("IS_ORDER", "false").lower() == "true"

if not secret or not client_id:
    raise Exception("Environment MUST contain 'API_SECRET' and 'API_CLIENT_ID'")

api_client = TruvClient(secret=secret, client_id=client_id, product_type=product_type)
logging.info("ENVIRONMENT: %s", json.dumps(api_client.headers, indent=4))

# Initialize database
db.init_db()

token = None


def get_token():
    global token
    return token


def save_token(value):
    global token
    token = value
    return token


# ============================================================
# Page routes
# ============================================================

@app.context_processor
def inject_vars():
    return dict(server_url=flask.request.url_root)


@app.route("/")
def index():
    """Serve the multi-workflow SPA."""
    return render_template("index.html")


@app.route("/employment")
def employment_page():
    return render_template("employment.html")


@app.route("/income")
def income_page():
    return render_template("income.html")


@app.route("/admin")
def admin_page():
    return render_template("admin.html")


@app.route("/deposit_switch")
def deposit_switch_page():
    return render_template("deposit_switch.html")


@app.route("/pll")
def pll_page():
    return render_template("pll.html")


# ============================================================
# New API routes — Orders workflow
# ============================================================

@app.route("/api/orders", methods=["POST"])
def api_create_order():
    """Create a Truv order (embedded or hosted)."""
    data = request.get_json(force=True) or {}
    order_id = db.generate_id()
    demo_id = data.get("demo_id", "embedded-orders")

    params = {
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "ssn": data.get("ssn"),
        "product_type": data.get("product_type", product_type),
    }

    result = api_client.create_order(params)
    truv_data = result["data"]
    status_code = result["status_code"]

    # If Truv returned an error, return it to the client
    if status_code >= 400:
        return jsonify({"error": "Truv API error", "details": truv_data}), status_code

    # Insert order first (so FK constraint is satisfied for api_logs)
    db.create_order(
        order_id=order_id,
        truv_order_id=truv_data.get("id"),
        demo_id=demo_id,
        bridge_token=truv_data.get("bridge_token"),
        share_url=truv_data.get("share_url"),
        status=truv_data.get("status", "created"),
        raw_response=truv_data,
    )

    api_logger.log_api_call(
        order_id=order_id,
        method="POST",
        endpoint="/v1/orders/",
        request_body=params,
        response_body=truv_data,
        status_code=status_code,
        duration_ms=result["duration_ms"],
    )

    return jsonify({
        "order_id": order_id,
        "truv_order_id": truv_data.get("id"),
        "bridge_token": truv_data.get("bridge_token"),
        "share_url": truv_data.get("share_url"),
        "status": truv_data.get("status"),
    })


@app.route("/api/orders/<order_id>", methods=["GET"])
def api_get_order(order_id):
    """Get order details from local DB + refresh from Truv."""
    order = db.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    truv_order_id = order.get("truv_order_id")
    if truv_order_id:
        result = api_client.get_order(truv_order_id)
        truv_data = result["data"]

        api_logger.log_api_call(
            order_id=order_id,
            method="GET",
            endpoint=f"/v1/orders/{truv_order_id}/",
            response_body=truv_data,
            status_code=result["status_code"],
            duration_ms=result["duration_ms"],
        )

        db.update_order(
            order_id,
            status=truv_data.get("status", order["status"]),
            raw_response=truv_data,
        )
        order = db.get_order(order_id)

    raw = json.loads(order["raw_response"]) if order.get("raw_response") else {}
    return jsonify({
        "order_id": order["id"],
        "truv_order_id": order.get("truv_order_id"),
        "status": order.get("status"),
        "bridge_token": order.get("bridge_token"),
        "share_url": order.get("share_url"),
        "raw_response": raw,
    })


@app.route("/api/orders/<order_id>/refresh", methods=["POST"])
def api_refresh_order(order_id):
    """Refresh an existing order."""
    order = db.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    truv_order_id = order.get("truv_order_id")
    if not truv_order_id:
        return jsonify({"error": "No Truv order ID"}), 400

    result = api_client.refresh_order(truv_order_id)

    api_logger.log_api_call(
        order_id=order_id,
        method="POST",
        endpoint=f"/v1/orders/{truv_order_id}/refresh/",
        response_body=result["data"],
        status_code=result["status_code"],
        duration_ms=result["duration_ms"],
    )

    return jsonify(result["data"])


@app.route("/api/orders/<order_id>/certifications", methods=["GET"])
def api_get_certifications(order_id):
    """Get certifications for an order."""
    order = db.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404

    truv_order_id = order.get("truv_order_id")
    if not truv_order_id:
        return jsonify({"error": "No Truv order ID"}), 400

    result = api_client.get_order_certifications(truv_order_id)

    api_logger.log_api_call(
        order_id=order_id,
        method="GET",
        endpoint=f"/v1/orders/{truv_order_id}/certifications/",
        response_body=result["data"],
        status_code=result["status_code"],
        duration_ms=result["duration_ms"],
    )

    return jsonify(result["data"])


@app.route("/api/orders/<order_id>/logs", methods=["GET"])
def api_get_order_logs(order_id):
    """Get API logs for an order."""
    logs = db.get_api_logs(order_id)
    return jsonify(logs)


@app.route("/api/orders/<order_id>/webhooks", methods=["GET"])
def api_get_order_webhooks(order_id):
    """Get webhook events for an order."""
    events = db.get_webhook_events(order_id)
    return jsonify(events)


# ============================================================
# Bridge Token route (Users API — for Bridge Widget workflow)
# ============================================================

@app.route("/api/bridge-token", methods=["POST"])
def api_create_bridge_token():
    """Create user + bridge token via the Users API."""
    data = request.get_json(force=True) or {}
    pt = data.get("product_type", product_type)
    order_id = data.get("order_id")

    user_result = api_client.create_user()
    user_data = user_result["data"]

    if order_id:
        api_logger.log_api_call(
            order_id=order_id,
            method="POST",
            endpoint="/v1/users/",
            request_body={"product_type": pt},
            response_body=user_data,
            status_code=user_result["status_code"],
            duration_ms=user_result["duration_ms"],
        )

    token_result = api_client.create_user_bridge_token(user_data["id"], product_type=pt)
    token_data = token_result["data"]

    if order_id:
        api_logger.log_api_call(
            order_id=order_id,
            method="POST",
            endpoint=f"/v1/users/{user_data['id']}/tokens/",
            request_body={"product_type": pt},
            response_body=token_data,
            status_code=token_result["status_code"],
            duration_ms=token_result["duration_ms"],
        )

    return jsonify({
        "bridge_token": token_data.get("bridge_token"),
        "user_id": user_data.get("id"),
    })


@app.route("/api/link-report/<public_token>/<report_type>", methods=["GET"])
def api_get_link_report(public_token, report_type):
    """Exchange public token and get link report."""
    order_id = request.args.get("order_id")

    access_result = api_client.get_access_token(public_token)
    access_data = access_result["data"]

    if order_id:
        api_logger.log_api_call(
            order_id=order_id,
            method="POST",
            endpoint="/v1/link-access-tokens/",
            request_body={"public_token": public_token},
            response_body=access_data,
            status_code=access_result["status_code"],
            duration_ms=access_result["duration_ms"],
        )

    link_id = access_data.get("link_id")
    report_result = api_client.get_link_report(link_id, report_type)

    if order_id:
        api_logger.log_api_call(
            order_id=order_id,
            method="GET",
            endpoint=f"/v1/links/{link_id}/{report_type}/report",
            response_body=report_result["data"],
            status_code=report_result["status_code"],
            duration_ms=report_result["duration_ms"],
        )

    return jsonify(report_result["data"])


# ============================================================
# Webhooks
# ============================================================

def generate_webhook_sign(payload: str, key: str) -> str:
    generated_hash = hmac.new(
        key=key.encode("utf-8"),
        msg=payload.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return f"v1={generated_hash}"


@app.route("/api/webhooks/truv", methods=["POST"])
def api_webhook_receiver():
    """Receive and store Truv webhooks with HMAC verification."""
    raw_body = request.data.decode("UTF-8")
    expected_sig = generate_webhook_sign(raw_body, secret)
    actual_sig = request.headers.get("X-WEBHOOK-SIGN", "")
    sig_match = hmac.compare_digest(expected_sig, actual_sig)

    logging.info("TRUV: Webhook received (sig_match=%s)", sig_match)

    payload = request.get_json(force=True)
    event_type = payload.get("event_type")
    status = payload.get("status")
    webhook_id = payload.get("webhook_id")
    truv_order_id = payload.get("order_id")

    # Find local order by Truv order ID
    order_id = None
    if truv_order_id:
        order = db.find_order_by_truv_id(truv_order_id)
        if order:
            order_id = order["id"]
            if status:
                db.update_order(order_id, status=status)

    api_logger.push_webhook_event(
        order_id=order_id,
        webhook_id=webhook_id,
        event_type=event_type,
        status=status,
        payload=payload,
    )

    logging.info("TRUV: Webhook event_type=%s status=%s order_id=%s", event_type, status, order_id)
    return ""


# Legacy webhook endpoint (backward compat)
@app.route("/webhook", methods=["POST"])
def webhook_legacy():
    """Legacy webhook endpoint."""
    return api_webhook_receiver()


# ============================================================
# SSE Stream
# ============================================================

@app.route("/api/events/stream", methods=["GET"])
def api_event_stream():
    """SSE endpoint for real-time updates."""
    order_id = request.args.get("order_id")
    if not order_id:
        return jsonify({"error": "order_id required"}), 400

    q = api_logger.subscribe(order_id)

    def generate():
        try:
            while True:
                try:
                    msg = q.get(timeout=30)
                    event_type = msg.get("event", "message")
                    data = json.dumps(msg.get("data", {}))
                    yield f"event: {event_type}\ndata: {data}\n\n"
                except Exception:
                    # Timeout — send keepalive ping
                    yield f"event: ping\ndata: {{}}\n\n"
        except GeneratorExit:
            api_logger.unsubscribe(order_id, q)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================
# Legacy routes (backward compatibility with existing HTML templates)
# ============================================================

@app.route("/getBridgeToken", methods=["GET"])
def create_bridge_token():
    if is_order:
        result = api_client.create_order()
        return jsonify(result["data"])
    user_result = api_client.create_user()
    user_data = user_result["data"]
    token_result = api_client.create_user_bridge_token(user_id=user_data["id"])
    return jsonify(token_result["data"])


@app.route("/getVerifications/<public_token>", methods=["GET"])
def get_verification_info_by_token(public_token: str):
    access_result = api_client.get_access_token(public_token)
    access_data = access_result["data"]
    save_token(access_data)

    if product_type in ["employment", "income"]:
        report_result = api_client.get_link_report(access_data["link_id"], product_type)
        return jsonify(report_result["data"])

    raise ValueError("Unsupported product type!")


@app.route("/createRefreshTask", methods=["GET"])
def create_refresh_task_by_token():
    link_token = get_token()
    if not link_token:
        raise ValueError("No link token data found")

    task_result = api_client.create_refresh_task(link_token["access_token"])
    task_id = task_result["data"]["task_id"]

    refresh_result = api_client.get_refresh_task(task_id)
    finished = ["done", "login_error", "mfa_error", "config_error",
                "account_locked", "no_data", "unavailable", "error"]

    while refresh_result["data"]["status"] not in finished:
        logging.info("TRUV: Refresh task not finished. Waiting 2s...")
        time.sleep(2)
        refresh_result = api_client.get_refresh_task(task_id)

    logging.info("TRUV: Refresh task finished.")

    if product_type in ["employment", "income"]:
        report_result = api_client.get_link_report(link_token["link_id"], product_type)
        return jsonify(report_result["data"])

    if product_type == "admin":
        return jsonify(get_admin_data(link_token["access_token"]))

    raise ValueError("Unsupported product type!")


@app.route("/getDepositSwitchData/<public_token>", methods=["GET"])
def get_deposit_switch_data_by_token(public_token: str):
    access_result = api_client.get_access_token(public_token)
    access_data = access_result["data"]
    report_result = api_client.get_link_report(access_data["link_id"], "direct_deposit")
    return jsonify(report_result["data"])


@app.route("/getPaycheckLinkedLoanData/<public_token>", methods=["GET"])
def get_pll_data_by_token(public_token: str):
    access_result = api_client.get_access_token(public_token)
    access_data = access_result["data"]
    report_result = api_client.get_link_report(access_data["link_id"], "pll")
    return jsonify(report_result["data"])


@app.route("/getAdminData/<public_token>", methods=["GET"])
def get_admin_data_by_token(public_token: str):
    access_result = api_client.get_access_token(public_token)
    access_data = access_result["data"]
    access_token = access_data["access_token"]
    return jsonify(get_admin_data(access_token))


def get_admin_data(access_token: str) -> dict:
    dir_result = api_client.get_employee_directory_by_token(access_token)
    directory = dir_result["data"]

    report_id_result = api_client.request_payroll_report(access_token, "2020-01-01", "2020-02-01")
    report_id = report_id_result["data"]["payroll_report_id"]

    payroll_result = api_client.get_payroll_report_by_id(report_id)
    payroll = payroll_result["data"]
    if payroll.get("status") != "done":
        logging.info("TRUV: Report not complete. Waiting...")
        time.sleep(2)
        payroll_result = api_client.get_payroll_report_by_id(report_id)
        payroll = payroll_result["data"]

    return {"directory": directory, "payroll": payroll}


if __name__ == "__main__":
    app.debug = True
    app.run(port=flask_port)
    logging.info("Quickstart running on http://localhost:%s", flask_port)
