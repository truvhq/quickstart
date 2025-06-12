import logging
from uuid import uuid4

import requests
from faker import Faker

fake = Faker()


class TruvClient:
    api_url = "https://prod.truv.com/v1/"

    def __init__(
        self, client_id: str, secret: str, product_type: str, api_url: str = None
    ):
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
        headers = kwargs.pop("headers", {})
        headers.update(self.headers)

        url = self.api_url + endpoint

        try:
            response = requests.request(
                method,
                url,
                headers=headers,
                **kwargs,
            )
            logging.info(
                "TRUV: Response: %s %s - %s:\n %s\n",
                method.upper(),
                url,
                response.status_code,
                response.content,
            )

            response.raise_for_status()
            return response.json()

        except requests.exceptions.HTTPError as err:
            logging.exception("API Request Error: %s", err.response.text)
            raise err

    def post(self, endpoint: str, **kwargs) -> dict:
        return self._request("post", endpoint, **kwargs)

    def get(self, endpoint: str, **kwargs) -> dict:
        return self._request("get", endpoint, **kwargs)

    def create_user(self, **kwargs) -> dict:
        logging.info("TRUV: Requesting new user from https://prod.truv.com/v1/users/")
        payload = {
            "external_user_id": f"qs-{uuid4().hex}",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(domain="example.com"),
            **kwargs,
        }
        return self.post("users/", json=payload)

    def create_user_bridge_token(self, user_id: str) -> dict:
        logging.info(
            "TRUV: Requesting user bridge token from https://prod.truv.com/v1/users/{user_id}/tokens"
        )
        logging.info("TRUV: User ID - %s", user_id)

        payload = {
            "product_type": self.product_type,
            "tracking_info": "1338-0111-A",
        }

        if self.product_type in ["deposit_switch", "pll"]:
            payload["account"] = {
                "account_number": "16002600",
                "account_type": "checking",
                "routing_number": "12345678",
                "bank_name": fake.company(),
            }

            if self.product_type == "pll":
                payload["account"].update(
                    {
                        "deposit_type": "amount",
                        "deposit_value": "100",
                    }
                )
        return self.post(f"users/{user_id}/tokens/", json=payload)
    
    def create_order(self) -> dict:
        logging.info(
            "TRUV: Requesting order from https://prod.truv.com/v1/orders/"
        )

        payload = {
            "order_number": f"qs-{uuid4().hex}",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(domain="example.com"),
            "products": [self.product_type]
        }

        if self.product_type in ["deposit_switch", "pll", "employment"]:
            payload["employers"] = [
                {
                    "company_name": "Home Depot"
                }
            ]

        if self.product_type in ["deposit_switch", "pll"]:
            payload["employers"][0]["account"] = {
                "account_number": "16002600",
                "account_type": "checking",
                "routing_number": "12345678",
                "bank_name": "Truv Bank",
            }

            if self.product_type == "pll":
                payload["employers"][0]["account"].update(
                    {
                        "deposit_type": "amount",
                        "deposit_value": "100",
                    }
                )
        
        return self.post("orders/", json=payload)

    def get_access_token(self, public_token: str) -> dict:
        logging.info(
            "TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens"
        )
        logging.info("TRUV: Public Token - %s", public_token)

        return self.post(
            "link-access-tokens/",
            json={
                "public_token": public_token,
            },
        )

    def get_link_report(self, link_id: str, product_type: str) -> dict:
        logging.info(
            f"TRUV: Requesting {product_type} report from "
            f"https://prod.truv.com/v1/links/{link_id}/{product_type}/report",
        )
        logging.info("TRUV: Link ID - %s", link_id)
        return self.get(f"links/{link_id}/{product_type}/report")

    def create_refresh_task(self, access_token: str) -> dict:
        logging.info(
            "TRUV: Requesting a data refresh from https://prod.truv.com/v1/refresh/tasks"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "refresh/tasks/",
            json={
                "access_token": access_token,
            },
        )

    def get_refresh_task(self, task_id: str) -> dict:
        logging.info(
            "TRUV: Requesting a refresh task from https://prod.truv.com/v1/refresh/tasks/{task_id}"
        )
        logging.info("TRUV: Task ID - %s", task_id)

        return self.get(f"refresh/tasks/{task_id}/")

    def get_employee_directory_by_token(self, access_token: str) -> dict:
        logging.info(
            "TRUV: Requesting employee directory data from https://prod.truv.com/v1/link/reports/admin/"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "link/reports/admin/",
            json={
                "access_token": access_token,
            },
        )

    def request_payroll_report(
        self, access_token: str, start_date: str, end_date: str
    ) -> dict:
        logging.info(
            "TRUV: Requesting a payroll report be created from https://prod.truv.com/v1/administrators/payrolls"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "administrators/payrolls/",
            json={
                "access_token": access_token,
                "start_date": start_date,
                "end_date": end_date,
            },
        )

    def get_payroll_report_by_id(self, report_id: str) -> dict:
        logging.info(
            "TRUV: Requesting a payroll report from https://prod.truv.com/v1/administrators/payrolls/{report_id}"
        )
        logging.info("TRUV: Report ID - %s", report_id)

        return self.get(f"administrators/payrolls/{report_id}")
