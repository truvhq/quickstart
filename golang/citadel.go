package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

// PublicTokenRequest is used to define the body for requesting an
// access token with a public token
type PublicTokenRequest struct {
	PublicToken string `json:"public_token"`
}

// AccessTokenRequest is used to define the body for multiple
// Citadel API endpoints requesting data with an access token
type AccessTokenRequest struct {
	AccessToken string `json:"access_token"`
}

type SettingsRequest struct {
	MicroDeposits []string `json:"micro_deposits"`
}

// RefreshRequest is used to define the body for the task refresh
// endpoint
type RefreshRequest struct {
	AccessToken string `json:"access_token"`
	Settings SettingsRequest `json:"settings"`
}

// AccessTokenResponse is used to define the body for the
// response of requesting an access token
type AccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	LinkId string `json:"link_id"`
}

// CreateRefreshTaskResponse is used to define the body for the
// response of requesting a task refresh
type CreateRefreshTaskResponse struct {
	TaskId string `json:"task_id"`
}

type AccountRequest struct {
	AccountNumber  string `json:"account_number"`
	AccountType  string `json:"account_type"`
	RoutingNumber  string `json:"routing_number"`
	BankName  string `json:"bank_name"`
}

// PayrollReportRequest defines the body of the request when requesting
// a payroll report
type BridgeTokenRequest struct {
	ProductType  string `json:"product_type"`
	ClientName   string `json:"client_name"`
	TrackingInfo string `json:"tracking_info"`
	Account      *AccountRequest `json:"account,omitempty"`
}

// getRequest creates an http request with the required HTTP headers
func getRequest(endpoint string, method string, body []byte) (*http.Request, error) {
	clientId := os.Getenv("API_CLIENT_ID")
	accessKey := os.Getenv("API_SECRET")
	fullEndpoint := fmt.Sprintf("%s%s", "https://prod.citadelid.com/v1/", endpoint)
	request, _ := http.NewRequest(method, fullEndpoint, bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Access-Client-Id", clientId)
	request.Header.Set("X-Access-Secret", accessKey)
	return request, nil
}

// getBridgeToken requests a bridge token from the Citadel API
func getBridgeToken() (string, error) {
	fmt.Println("CITADEL: Requesting bridge token from https://prod.citadelid.com/v1/bridge-tokens")
	productType := os.Getenv("API_PRODUCT_TYPE")
	bridgeTokenRequest := BridgeTokenRequest{ProductType: productType, ClientName: "Citadel Quickstart", TrackingInfo: "1337"}
	if productType == "fas" || productType == "deposit_switch" {
		account := AccountRequest{AccountNumber: "16002600", AccountType: "checking", RoutingNumber: "123456789", BankName: "TD Bank"}
		bridgeTokenRequest.Account = &account
	}
	bridgeJson, _ := json.Marshal(bridgeTokenRequest)
	request, err := getRequest("bridge-tokens/", "POST", bridgeJson)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	response, err := client.Do(request)

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(response.Body)
	return (string(data)), nil
}

// getAccessToken requests an access token from the Citadel API
// with the given public token
func getAccessToken(public_token string) (string, error) {
	fmt.Println("CITADEL: Exchanging a public_token for an access_token from https://prod.citadelid.com/v1/link-access-tokens")
	fmt.Printf("CITADEL: Public Token - %s\n", public_token)
	publicToken := PublicTokenRequest{PublicToken: public_token}
	jsonPublicToken, _ := json.Marshal(publicToken)
	accessToken := AccessTokenResponse{}
	request, err := getRequest("link-access-tokens/", "POST", jsonPublicToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	err = json.NewDecoder(res.Body).Decode(&accessToken)
	if err != nil {
		return "", err
	}
	return accessToken.AccessToken, nil
}

// getEmploymentInfoByToken uses the given access token to request
// the associated employment verification info
func getEmploymentInfoByToken(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting employment verification data using an access_token from https://prod.citadelid.com/v1/verifications/employments")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("verifications/employments", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getIncomeInfoByToken uses the given access token to request
// the associated income verification info
func getIncomeInfoByToken(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting income verification data using an access_token from https://prod.citadelid.com/v1/verifications/incomes")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("verifications/incomes", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// createRefreshTask uses the given access token to request
// a task refresh
func createRefreshTask(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting a data refresh using an access_token from https://prod.citadelid.com/v1/refresh/tasks")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("refresh/tasks", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	
	refreshTask := CreateRefreshTaskResponse{}
	err = json.NewDecoder(res.Body).Decode(&refreshTask)

	if err != nil {
		return "", err
	}

	return refreshTask.TaskId, nil
}

// getRefreshTask requests a task refresh update
func getRefreshTask(taskId string) (string, error) {
	fmt.Println("CITADEL: Requesting a refresh task using a task_id from https://prod.citadelid.com/v1/refresh/tasks/{task_id}")
	fmt.Printf("CITADEL: Task ID - %s\n", taskId)
	request, err := getRequest(fmt.Sprintf("refresh/tasks/%s", taskId), "GET", nil)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getEmployeeDirectoryByToken uses the given access token to request
// the associated employee directory info
func getEmployeeDirectoryByToken(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting employee directory data using an access_token from https://prod.citadelid.com/v1/administrators/directories")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("administrators/directories", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// PayrollReportRequest defines the body of the request when requesting
// a payroll report
type PayrollReportRequest struct {
	AccessToken string `json:"access_token"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
}

// PayrollReportResponse defines the body of the response when requesting
// a payroll report
type PayrollReportResponse struct {
	PayrollReportId string `json:"payroll_report_id"`
}

// requestPayrollReport uses the given access token to request
// the associated payroll report
func requestPayrollReport(access_token, start_date, end_date string) (*PayrollReportResponse, error) {
	fmt.Println("CITADEL: Requesting a payroll report be created using an access_token from https://prod.citadelid.com/v1/administrators/payrolls")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	reportRequest := PayrollReportRequest{AccessToken: access_token, StartDate: start_date, EndDate: end_date}
	jsonReportRequest, _ := json.Marshal(reportRequest)
	payrollReport := PayrollReportResponse{}
	request, err := getRequest("administrators/payrolls", "POST", jsonReportRequest)
	if err != nil {
		return nil, err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return nil, err
	}
	err = json.NewDecoder(res.Body).Decode(&payrollReport)
	if err != nil {
		return nil, err
	}
	return &payrollReport, nil
}
	
// getPayrollById requests the payroll report associated to the given id
func getPayrollById(reportId string) (string, error) {
	fmt.Println("CITADEL: Requesting a payroll report using a report_id from https://prod.citadelid.com/v1/administrators/payrolls/{report_id}")
	fmt.Printf("CITADEL: Report ID - %s\n", reportId)
	request, err := getRequest(fmt.Sprintf("administrators/payrolls/%s", reportId), "GET", nil)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getFundingSwitchStatusByToken uses the given access token to request
// the associated funding switch requests
func getFundingSwitchStatusByToken(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting funding switch update data using an access_token from https://prod.citadelid.com/v1/account-switches")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("account-switches", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// completeFundingSwitchFlowByToken uses the given access token to request
// a task refresh to complete the Funding account switch flow
func completeFundingSwitchFlowByToken(access_token string, first_micro string, second_micro string) (string, error) {
	fmt.Println("CITADEL: Completing funding switch flow with a Task refresh using an access_token from https://prod.citadelid.com/v1/refresh/tasks")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := RefreshRequest{AccessToken: access_token, Settings: SettingsRequest{ MicroDeposits: []string{first_micro, second_micro} }}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("refresh/tasks", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getDepositSwitchByToken uses the given access token to request
// the associated deposit switch info
func getDepositSwitchByToken(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting direct deposit switch data using an access_token from https://prod.citadelid.com/v1/deposit-switches")
	fmt.Printf("CITADEL: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("deposit-switches", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		return "", err
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}