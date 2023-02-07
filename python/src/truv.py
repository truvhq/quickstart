import logging

import requests


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

        return requests.request(
            method,
            self.api_url + endpoint,
            headers=headers,
            **kwargs,
        ).json()

    def post(self, endpoint: str, **kwargs) -> dict:
        return self._request("post", endpoint, **kwargs)

    def get(self, endpoint: str, **kwargs) -> dict:
        return self._request("get", endpoint, **kwargs)

    def get_bridge_token(self) -> dict:
        logging.info(
            "TRUV: Requesting bridge token from https://prod.truv.com/v1/bridge-tokens"
        )

        payload = {
            "product_type": self.product_type,
            "client_name": "Truv QuickStart",
            "tracking_info": "1337",
        }

        if self.product_type in ["deposit_switch", "pll"]:
            payload["account"] = {
                "account_number": "16002600",
                "account_type": "checking",
                "routing_number": "123456789",
                "bank_name": "TD Bank",
            }

            if self.product_type == "pll":
                payload["account"].update(
                    {
                        "deposit_type": "amount",
                        "deposit_value": "1",
                    }
                )

        return self.post("bridge-tokens/", json=payload)

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

    def get_employment_info_by_token(self, access_token: str) -> dict:
        logging.info(
            "TRUV: Requesting employment report data from https://prod.truv.com/v1/links/reports/employment/"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "links/reports/employment/",
            json={
                "access_token": access_token,
            },
        )

    def get_income_info_by_token(self, access_token: str) -> dict:
        logging.info(
            "TRUV: Requesting income report data from https://prod.truv.com/v1/links/reports/income/"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "links/reports/income/",
            json={
                "access_token": access_token,
            },
        )

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

        return self.get("refresh/tasks/" + task_id)

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

    def get_deposit_switch_by_token(self, access_token: str) -> dict:
        logging.info(
            "TRUV: Requesting direct deposit switch data from https://prod.truv.com/v1//links/reports/direct_deposit/"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "links/reports/direct_deposit/",
            json={
                "access_token": access_token,
            },
        )

    def get_pll_by_token(self, access_token: str) -> dict:
        logging.info(
            "TRUV: Requesting pll data from https://prod.truv.com/v1/links/reports/pll/"
        )
        logging.info("TRUV: Access Token - %s", access_token)

        return self.post(
            "links/reports/pll/",
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

        return self.get("administrators/payrolls/" + report_id)
