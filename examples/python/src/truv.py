import logging
import time
from uuid import uuid4

import requests
from faker import Faker

fake = Faker()


class TruvClient:
    api_url = "https://prod.truv.com/v1/"

    def __init__(
        self, client_id: str, secret: str, product_type: str = "income", api_url: str = None
    ):
        self.client_id = client_id
        self.secret = secret
        self.headers = {
            "X-Access-Client-Id": client_id,
            "X-Access-Secret": secret,
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json",
        }
        if api_url:
            self.api_url = api_url
        self.product_type = product_type

    def _request(self, method, endpoint, **kwargs) -> dict:
        """Make an API request and return {status_code, data, duration_ms}."""
        headers = kwargs.pop("headers", {})
        headers.update(self.headers)

        url = self.api_url + endpoint
        start = time.perf_counter()

        try:
            response = requests.request(
                method,
                url,
                headers=headers,
                timeout=15,
                **kwargs,
            )
            duration_ms = round((time.perf_counter() - start) * 1000, 1)

            logging.info(
                "TRUV: Response: %s %s - %s (%.1fms)",
                method.upper(),
                url,
                response.status_code,
                duration_ms,
            )

            data = None
            try:
                data = response.json()
            except Exception:
                data = {"raw": response.text}

            return {
                "status_code": response.status_code,
                "data": data,
                "duration_ms": duration_ms,
            }

        except requests.exceptions.RequestException as err:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            logging.exception("API Request Error: %s", err)
            raise

    def post(self, endpoint: str, **kwargs) -> dict:
        return self._request("post", endpoint, **kwargs)

    def get(self, endpoint: str, **kwargs) -> dict:
        return self._request("get", endpoint, **kwargs)

    # --- Users API ---

    def create_user(self, **kwargs) -> dict:
        logging.info("TRUV: Creating new user")
        payload = {
            "external_user_id": f"qs-{uuid4().hex}",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(domain="example.com"),
            **kwargs,
        }
        return self.post("users/", json=payload)

    def create_user_bridge_token(self, user_id: str, product_type: str = None) -> dict:
        logging.info("TRUV: Creating bridge token for user %s", user_id)
        pt = product_type or self.product_type

        payload = {
            "product_type": pt,
            "tracking_info": "1338-0111-A",
        }

        if pt in ["deposit_switch", "pll"]:
            payload["account"] = {
                "account_number": "16002600",
                "account_type": "checking",
                "routing_number": "12345678",
                "bank_name": fake.company(),
            }
            if pt == "pll":
                payload["account"].update({
                    "deposit_type": "amount",
                    "deposit_value": "100",
                })

        return self.post(f"users/{user_id}/tokens/", json=payload)

    # --- Orders API ---

    def create_order(self, params: dict = None) -> dict:
        """POST /v1/orders/ — create an order (embedded or hosted)."""
        logging.info("TRUV: Creating order")
        if params is None:
            params = {}

        product_type = params.get("product_type", self.product_type)

        payload = {
            "order_number": f"qs-{uuid4().hex}",
            "first_name": params.get("first_name") or fake.first_name(),
            "last_name": params.get("last_name") or fake.last_name(),
            "email": params.get("email") or fake.email(domain="example.com"),
            "products": [product_type],
        }

        if params.get("phone"):
            payload["phone"] = params["phone"]

        if params.get("ssn"):
            payload["social_security_number"] = params["ssn"]

        if product_type in ["deposit_switch", "pll", "employment", "income"]:
            payload["employers"] = [{"company_name": "Home Depot"}]

        if product_type in ["deposit_switch", "pll"]:
            payload["employers"][0]["account"] = {
                "account_number": "16002600",
                "account_type": "checking",
                "routing_number": "12345678",
                "bank_name": "Truv Bank",
            }
            if product_type == "pll":
                payload["employers"][0]["account"].update({
                    "deposit_type": "amount",
                    "deposit_value": "100",
                })

        return self.post("orders/", json=payload)

    def get_order(self, truv_order_id: str) -> dict:
        """GET /v1/orders/{id}/ — get order details."""
        logging.info("TRUV: Getting order %s", truv_order_id)
        return self.get(f"orders/{truv_order_id}/")

    def refresh_order(self, truv_order_id: str) -> dict:
        """POST /v1/orders/{id}/refresh/ — refresh an order."""
        logging.info("TRUV: Refreshing order %s", truv_order_id)
        return self.post(f"orders/{truv_order_id}/refresh/")

    def get_order_certifications(self, truv_order_id: str) -> dict:
        """GET /v1/orders/{id}/certifications/ — get certifications."""
        logging.info("TRUV: Getting certifications for order %s", truv_order_id)
        return self.get(f"orders/{truv_order_id}/certifications/")

    # --- Token Exchange & Reports ---

    def get_access_token(self, public_token: str) -> dict:
        logging.info("TRUV: Exchanging public_token for access_token")
        return self.post("link-access-tokens/", json={"public_token": public_token})

    def get_link_report(self, link_id: str, product_type: str) -> dict:
        logging.info("TRUV: Getting %s report for link %s", product_type, link_id)
        return self.get(f"links/{link_id}/{product_type}/report")

    # --- Refresh Tasks (Users API) ---

    def create_refresh_task(self, access_token: str) -> dict:
        logging.info("TRUV: Creating refresh task")
        return self.post("refresh/tasks/", json={"access_token": access_token})

    def get_refresh_task(self, task_id: str) -> dict:
        logging.info("TRUV: Getting refresh task %s", task_id)
        return self.get(f"refresh/tasks/{task_id}/")

    # --- Admin ---

    def get_employee_directory_by_token(self, access_token: str) -> dict:
        logging.info("TRUV: Getting employee directory")
        return self.post("link/reports/admin/", json={"access_token": access_token})

    def request_payroll_report(self, access_token: str, start_date: str, end_date: str) -> dict:
        logging.info("TRUV: Requesting payroll report")
        return self.post(
            "administrators/payrolls/",
            json={"access_token": access_token, "start_date": start_date, "end_date": end_date},
        )

    def get_payroll_report_by_id(self, report_id: str) -> dict:
        logging.info("TRUV: Getting payroll report %s", report_id)
        return self.get(f"administrators/payrolls/{report_id}")
