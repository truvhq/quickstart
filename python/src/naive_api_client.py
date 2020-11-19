from typing import TypedDict, List, Any

import requests

# https://docs.citadelid.com
# Header which using in private api calls
ApiHeaders = TypedDict('ApiHeaders', {
    'X-Access-Secret': str,
    'X-Access-Client-Id': str,
    'Content-Type': str
})


class NaiveApiClient:
    """
    Just naive api client to show how flow works,
    without errors processing and other like that
    """
    API_URL: str
    API_HEADERS: ApiHeaders

    def __init__(self,
                 api_url: str,
                 secret: str,
                 client_id: str,
                 ):
        self.API_URL = api_url
        self.API_HEADERS = {
            'X-Access-Secret': secret,
            'X-Access-Client-Id': client_id,
            'Content-Type': 'application/json;charset=UTF-8',
        }

    def get_bridge_token(self) -> Any:
        """
        https://docs.citadelid.com/?python#bridge-tokens_create
        :param public_token:
        :return:
        """
        tokens: Any = requests.post(
            self.API_URL + 'bridge-tokens/',
            headers=self.API_HEADERS,
        ).json()
        return tokens

    def get_access_token(self, public_token: str) -> str:
        """
        https://docs.citadelid.com/?python#exchange-token-flow
        :param public_token:
        :return:
        """

        class AccessTokenRequest(TypedDict):
            public_tokens: List[str]

        class AccessTokenResponse(TypedDict):
            access_tokens: List[str]

        request_data: AccessTokenRequest = {
            'public_tokens': [public_token],
        }

        tokens: AccessTokenResponse = requests.post(
            self.API_URL + 'access-tokens/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()
        return tokens['access_tokens'][0]

    def get_employment_info_by_token(self, access_token: str) -> Any:
        """
        https://docs.citadelid.com/#employment-verification
        :param access_token:
        :return:
        """

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
        https://docs.citadelid.com/#income-verification
        :param access_token:
        :return:
        """

        class VerificationRequest(TypedDict):
            access_token: str

        request_data: VerificationRequest = {'access_token': access_token}

        return requests.post(
            self.API_URL + 'verifications/incomes/',
            json=request_data,
            headers=self.API_HEADERS,
        ).json()