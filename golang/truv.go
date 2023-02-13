package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"time"
	"log"
)

// PublicTokenRequest is used to define the body for requesting an
// access token with a public token
type PublicTokenRequest struct {
	PublicToken string `json:"public_token"`
}

// AccessTokenRequest is used to define the body for multiple
// Truv API endpoints requesting data with an access token
type AccessTokenRequest struct {
	AccessToken string `json:"access_token"`
}

// AccessTokenResponse is used to define the body for the
// response of requesting an access token
type AccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	LinkId      string `json:"link_id"`
}

// CreateRefreshTaskResponse is used to define the body for the
// response of requesting a task refresh
type CreateRefreshTaskResponse struct {
	TaskId string `json:"task_id"`
}

type AccountRequest struct {
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type"`
	RoutingNumber string `json:"routing_number"`
	BankName      string `json:"bank_name"`
	DepositType   string `json:"deposit_type"`
	DepositValue  string `json:"deposit_value"`
}

type UserRequest struct {
	ExternalUserId string `json:"external_user_id"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Email          string `json:"email"`
}

type UserResponse struct {
	UserId string `json:"id"`
}

// PayrollReportRequest defines the body of the request when requesting
// a payroll report
type BridgeTokenRequest struct {
	ProductType  string          `json:"product_type"`
	ClientName   string          `json:"client_name"`
	TrackingInfo string          `json:"tracking_info"`
	Account      *AccountRequest `json:"account,omitempty"`
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

// getRequest creates an http request with the required HTTP headers
func getRequest(endpoint string, method string, body []byte) (*http.Request, error) {
	clientId := os.Getenv("API_CLIENT_ID")
	accessKey := os.Getenv("API_SECRET")
	fullEndpoint := fmt.Sprintf("%s%s", "https://prod.truv.com/v1/", endpoint)
	request, _ := http.NewRequest(method, fullEndpoint, bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Access-Client-Id", clientId)
	request.Header.Set("X-Access-Secret", accessKey)
	return request, nil
}

// createUser creates a user from the Truv API
func createUser() (string, error) {
	log.Println("TRUV: Requesting new user from https://prod.truv.com/v1/users/")
	uniqueNumber := time.Now().UnixNano() / (1 << 22)
	userRequest := UserRequest{
		ExternalUserId: fmt.Sprintf("qs-%d", uniqueNumber),
		FirstName:      "John",
		LastName:       "Johnson",
		Email:          "j.johnson@example.com",
	}
	userJson, _ := json.Marshal(userRequest)
	request, err := getRequest("users/", "POST", userJson)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()

	user := UserResponse{}
	err = json.NewDecoder(res.Body).Decode(&user)

	return user.UserId, nil
}

// createUser creates a bridge token from the Truv API
// with the given userId
func createUserBridgeToken(userId string) (string, error) {
	log.Println("TRUV: Requesting user bridge token from https://prod.truv.com/v1/users/{user_id}/tokens")
	log.Printf("TRUV: User ID - %s\n", userId)
	productType := os.Getenv("API_PRODUCT_TYPE")
	bridgeTokenRequest := BridgeTokenRequest{
		ProductType:  productType,
		TrackingInfo: "1338-0111-A",
	}
	if productType == "pll" || productType == "deposit_switch" {
		account := AccountRequest{
			AccountNumber: "1600200",
			AccountType:   "checking",
			RoutingNumber: "123456789",
			BankName:      "TD Bank",
		}
		if productType == "pll" {
			account.DepositType = "amount"
			account.DepositValue = "1"
		}
		bridgeTokenRequest.Account = &account
	}
	bridgeJson, _ := json.Marshal(bridgeTokenRequest)
	request, err := getRequest(fmt.Sprintf("users/%s/tokens/", userId), "POST", bridgeJson)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer response.Body.Close()
	data, _ := ioutil.ReadAll(response.Body)
	return (string(data)), nil
}

// getAccessToken requests an access token from the Truv API
// with the given public token
func getAccessToken(public_token string) (string, error) {
	log.Println("TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens")
	log.Printf("TRUV: Public Token - %s\n", public_token)
	publicToken := PublicTokenRequest{PublicToken: public_token}
	jsonPublicToken, _ := json.Marshal(publicToken)
	accessToken := AccessTokenResponse{}
	request, err := getRequest("link-access-tokens/", "POST", jsonPublicToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	err = json.NewDecoder(res.Body).Decode(&accessToken)
	if err != nil {
		return "", err
	}
	return accessToken.AccessToken, nil
}

// getEmploymentInfoByToken uses the given access token to request
// the associated employment verification info
func getEmploymentInfoByToken(access_token string) (string, error) {
	log.Println("TRUV: Requesting employment verification data using an access_token from https://prod.truv.com/v1/links/reports/employment/")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("links/reports/employment/", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getIncomeInfoByToken uses the given access token to request
// the associated income verification info
func getIncomeInfoByToken(access_token string) (string, error) {
	log.Println("TRUV: Requesting income verification data using an access_token from https://prod.truv.com/v1/links/reports/income/")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("links/reports/income/", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// createRefreshTask uses the given access token to request
// a task refresh
func createRefreshTask(access_token string) (string, error) {
	log.Println("TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("refresh/tasks", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()

	refreshTask := CreateRefreshTaskResponse{}
	err = json.NewDecoder(res.Body).Decode(&refreshTask)

	if err != nil {
		return "", err
	}

	return refreshTask.TaskId, nil
}

// getRefreshTask requests a task refresh update
func getRefreshTask(taskId string) (string, error) {
	log.Println("TRUV: Requesting a refresh task using a task_id from https://prod.truv.com/v1/refresh/tasks/{task_id}")
	log.Printf("TRUV: Task ID - %s\n", taskId)
	request, err := getRequest(fmt.Sprintf("refresh/tasks/%s", taskId), "GET", nil)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getEmployeeDirectoryByToken uses the given access token to request
// the associated employee directory info
func getEmployeeDirectoryByToken(access_token string) (string, error) {
	log.Println("TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/links/reports/admin/")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("link/reports/admin/", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// requestPayrollReport uses the given access token to request
// the associated payroll report
func requestPayrollReport(access_token, start_date, end_date string) (*PayrollReportResponse, error) {
	log.Println("TRUV: Requesting a payroll report be created using an access_token from https://prod.truv.com/v1/administrators/payrolls")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	reportRequest := PayrollReportRequest{AccessToken: access_token, StartDate: start_date, EndDate: end_date}
	jsonReportRequest, _ := json.Marshal(reportRequest)
	payrollReport := PayrollReportResponse{}
	request, err := getRequest("administrators/payrolls", "POST", jsonReportRequest)
	if err != nil {
		return nil, err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()
	err = json.NewDecoder(res.Body).Decode(&payrollReport)
	if err != nil {
		return nil, err
	}
	return &payrollReport, nil
}

// getPayrollById requests the payroll report associated to the given id
func getPayrollById(reportId string) (string, error) {
	log.Println("TRUV: Requesting a payroll report using a report_id from https://prod.truv.com/v1/administrators/payrolls/{report_id}")
	log.Printf("TRUV: Report ID - %s\n", reportId)
	request, err := getRequest(fmt.Sprintf("administrators/payrolls/%s", reportId), "GET", nil)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getPaycheckLinkedLoanByToken uses the given access token to request
// the associated pll data
func getPaycheckLinkedLoanByToken(access_token string) (string, error) {
	log.Println("TRUV: Requesting pll data using an access_token from https://prod.truv.com/v1/links/reports/pll/")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("links/reports/pll/", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}

// getDepositSwitchByToken uses the given access token to request
// the associated deposit switch info
func getDepositSwitchByToken(access_token string) (string, error) {
	log.Println("TRUV: Requesting direct deposit switch data using an access_token from https://prod.truv.com/v1/links/reports/direct_deposit/")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("links/reports/direct_deposit/", "POST", jsonAccessToken)
	if err != nil {
		return "", err
	}
	client := &http.Client{}
	res, err := client.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, _ := ioutil.ReadAll(res.Body)
	return string(data), nil
}
