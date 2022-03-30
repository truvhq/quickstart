from typing import TypedDict, List, Any

import requests
import logging

# https://docs.truv.com
# Header which using in private api calls
ApiHeaders = TypedDict('ApiHeaders', {
    'X-Access-Secret': str,
    'X-Access-Client-Id': str,
    'Content-Type': str
})


class NaiveApiClient:
    """
    A naive api client to show how flow works,
    without errors processing and other like that
    """
    API_URL: str
    API_HEADERS: ApiHeaders
    PRODUCT_TYPE: str

    def __init__(self,
                 secret: str,
                 client_id: str,
                 product_type: str,
                 ):
        self.API_URL = 'https://prod.truv.com/v1/'
        self.PRODUCT_TYPE = product_type
        self.API_HEADERS = {
            'X-Access-Secret': secret,
            'X-Access-Client-Id': client_id,
            'Content-Type': 'application/json;charset=UTF-8',
        }

    def get_bridge_token(self) -> Any:
        """
        https://docs.truv.com/?python#bridge-tokens_create
        :param public_token:
        :return:
        """
        logging.info("TRUV: Requesting bridge token from https://prod.truv.com/v1/bridge-tokens")
        class BridgeTokenRequest(TypedDict):
            product_type: str
            client_name: str
            tracking_info: str
            account: TypedDict

        request_data: BridgeTokenRequest = {
            'product_type': self.PRODUCT_TYPE,
            'client_name': 'Truv Quickstart',
            'tracking_info': '1337'
        }

        if self.PRODUCT_TYPE == 'fas' or self.PRODUCT_TYPE == 'deposit_switch' or self.PRODUCT_TYPE == 'pll':
            request_data['account'] = {
                'account_number': '16002600',
                'account_type': 'checking',
                'routing_number': '123456789',
                'bank_name': 'TD Bank'
            }

            if self.PRODUCT_TYPE == 'pll':
                request_data['account']['deposit_type'] = 'amount'
                request_data['account']['deposit_value'] = '1'

        tokens: Any = requests.post(
            self.API_URL + 'bridge-tokens/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()
        return tokens

    def get_access_token(self, public_token: str) -> str:
        """
        https://docs.truv.com/?python#exchange-token-flow
        :param public_token:
        :return:
        """
        logging.info("TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens")
        logging.info("TRUV: Public Token - %s", public_token)
        class AccessTokenRequest(TypedDict):
            public_token: str

        class AccessTokenResponse(TypedDict):
            access_token: str
            link_id: str

        request_data: AccessTokenRequest = {
            'public_token': public_token,
        }

        tokens: AccessTokenResponse = requests.post(
            self.API_URL + 'link-access-tokens/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()
        return tokens

    def get_employment_info_by_token(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#employment-verification
        :param access_token:
        :return:
        """
        logging.info("TRUV: Requesting employment verification data using an access_token from https://prod.truv.com/v1/verifications/employments")
        logging.info("TRUV: Access Token - %s", access_token)
        class VerificationRequest(TypedDict):
            access_token: str

        request_data: VerificationRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'verifications/employments/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()

    def get_income_info_by_token(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#income-verification
        :param access_token:
        :return:
        """

        logging.info("TRUV: Requesting income verification data using an access_token from https://prod.truv.com/v1/verifications/incomes")
        logging.info("TRUV: Access Token - %s", access_token)
        class VerificationRequest(TypedDict):
            access_token: str

        request_data: VerificationRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'verifications/incomes/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()
    
    def create_refresh_task(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#data-refresh
        :param access_token:
        :return:
        """
        logging.info("TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks")
        logging.info("TRUV: Access Token - %s", access_token)
        class CreateRefreshTaskRequest(TypedDict):
            access_token: str

        request_data: CreateRefreshTaskRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'refresh/tasks/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()
    
    def get_refresh_task(self, task_id: str) -> Any:
        """
        https://docs.truv.com/#data-refresh
        :param task_id:
        :return:
        """
        logging.info("TRUV: Requesting a refresh task using a task_id from https://prod.truv.com/v1/refresh/tasks/{task_id}")
        logging.info("TRUV: Task ID - %s", task_id)

        return requests.get(
            self.API_URL + f'refresh/tasks/{task_id}',
            headers=self.API_HEADERS,
        ).json()

    def get_employee_directory_by_token(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#payroll-admin
        :param access_token:
        :return:
        """

        logging.info("TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/administrators/directories")
        logging.info("TRUV: Access Token - %s", access_token)
        class DirectoryRequest(TypedDict):
            access_token: str

        request_data: DirectoryRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'administrators/directories/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()

    def get_deposit_switch_by_token(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#direct-deposit
        :param access_token:
        :return:
        """

        logging.info("TRUV: Requesting direct deposit switch data using an access_token from https://prod.truv.com/v1/deposit-switches")
        logging.info("TRUV: Access Token - %s", access_token)
        class DepositSwitchRequest(TypedDict):
            access_token: str

        request_data: DepositSwitchRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'deposit-switches/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()

    def get_pll_by_token(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#paycheck-linked-loans
        :param access_token:
        :return:
        """

        logging.info("TRUV: Requesting pll data using an access_token from https://prod.truv.com/v1/paycheck-linked-loans/")
        logging.info("TRUV: Access Token - %s", access_token)
        class PLLRequest(TypedDict):
            access_token: str

        request_data: PLLRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'paycheck-linked-loans/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()

    def request_payroll_report(self, access_token: str, start_date: str , end_date: str) -> Any:
        """
        https://docs.truv.com/#payroll-admin
        :param access_token:
        :param start_date:
        :param end_date:
        :return: Payroll report ID
        """

        logging.info("TRUV: Requesting a payroll report be created using an access_token from https://prod.truv.com/v1/administrators/payrolls")
        logging.info("TRUV: Access Token - %s", access_token)
        class PayrollReportRequest(TypedDict):
            access_token: str
            start_date: str
            end_date: str

        request_data: PayrollReportRequest = {
            'access_token': access_token,
            'start_date': start_date,
            'end_date': end_date
        }

        return requests.post(
            self.API_URL + 'administrators/payrolls/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()

    def get_payroll_report_by_id(self, report_id: str) -> Any:
        """
        https://docs.truv.com/#payroll-admin
        :param report_id:
        :return:
        """

        logging.info("TRUV: Requesting a payroll report using a report_id from https://prod.truv.com/v1/administrators/payrolls/{report_id}")
        logging.info("TRUV: Report ID - %s", report_id)
        return requests.get(
            self.API_URL + f'administrators/payrolls/{report_id}',
            headers=self.API_HEADERS,
        ).json()
    
    def get_funding_switch_status_by_token(self, access_token: str) -> Any:
        """
        https://docs.truv.com/#fas-report
        :param access_token:
        :return:
        """
        logging.info("TRUV: Requesting funding switch update data using an access_token from https://prod.truv.com/v1/account-switches")
        logging.info("TRUV: Access Token - %s", access_token)
        class FundingSwitchRequest(TypedDict):
            access_token: str

        request_data: FundingSwitchRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'account-switches/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()

    def complete_funding_switch_flow_by_token(self, access_token: str, first_micro: float, second_micro: float) -> Any:
        """
        https://docs.truv.com/#funding-account
        :param access_token:
        :return:
        """
        logging.info("TRUV: Completing funding switch flow with a Task refresh using an access_token from https://prod.truv.com/v1/refresh/tasks")
        logging.info("TRUV: Access Token - %s", access_token)

        class SettingsRequest(TypedDict):
            micro_deposits: List[float]
        class RefreshRequest(TypedDict):
            access_token: str
            settings: SettingsRequest

        request_data: RefreshRequest = {'access_token': access_token, 'settings': { 'micro_deposits': [first_micro, second_micro]} }

        return requests.post(
            self.API_URL + 'refresh/tasks/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()
