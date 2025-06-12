package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
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
	DepositType   string `json:"deposit_type,omitempty"`
	DepositValue  string `json:"deposit_value,omitempty"`
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

// OrderRequest defines the body of the request when creating an order
type OrderRequest struct {
	OrderNumber string      `json:"order_number"`
	FirstName   string      `json:"first_name"`
	LastName    string      `json:"last_name"`
	Email       string      `json:"email"`
	Products    []string    `json:"products"`
	Employers   []Employer  `json:"employers,omitempty"`
}

// Employer defines the employer structure for orders
type Employer struct {
	CompanyName string          `json:"company_name"`
	Account     *AccountRequest `json:"account,omitempty"`
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
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer response.Body.Close()

	user := UserResponse{}
	err = json.NewDecoder(response.Body).Decode(&user)

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
			account.DepositValue = "100"
		}
		bridgeTokenRequest.Account = &account
	}
	bridgeJson, _ := json.Marshal(bridgeTokenRequest)
	request, err := getRequest(fmt.Sprintf("users/%s/tokens/", userId), "POST", bridgeJson)
	if err != nil {
		return "", err
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer response.Body.Close()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// createOrder creates an order from the Truv API
func createOrder() (string, error) {
	log.Println("TRUV: Requesting an order from https://prod.truv.com/v1/orders/")
	productType := os.Getenv("API_PRODUCT_TYPE")
	uniqueNumber := time.Now().UnixNano() / (1 << 22)
	
	orderRequest := OrderRequest{
		OrderNumber: fmt.Sprintf("qs-%d", uniqueNumber),
		FirstName:   "John",
		LastName:    "Johnson",
		Email:       "j.johnson@example.com",
		Products:    []string{productType},
	}

	// Add employers for certain product types
	if productType == "deposit_switch" || productType == "pll" || productType == "employment" {
		employer := Employer{
			CompanyName: "Home Depot",
		}
		
		// Add account information for deposit_switch and pll
		if productType == "deposit_switch" || productType == "pll" {
			account := AccountRequest{
				AccountNumber: "16002600",
				AccountType:   "checking",
				RoutingNumber: "12345678",
				BankName:      "Truv Bank",
			}
			
			if productType == "pll" {
				account.DepositType = "amount"
				account.DepositValue = "100"
			}
			
			employer.Account = &account
		}
		
		orderRequest.Employers = []Employer{employer}
	}

	orderJson, _ := json.Marshal(orderRequest)
	request, err := getRequest("orders/", "POST", orderJson)
	if err != nil {
		return "", err
	}
	

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer response.Body.Close()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// getAccessToken requests an access token from the Truv API
// with the given public token
func getAccessToken(public_token string) (*AccessTokenResponse, error) {
	log.Println("TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens")
	log.Printf("TRUV: Public Token - %s\n", public_token)
	publicToken := PublicTokenRequest{PublicToken: public_token}
	jsonPublicToken, _ := json.Marshal((publicToken))

	request, err := getRequest("link-access-tokens/", "POST", jsonPublicToken)
	if err != nil {
		return nil, err
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()
	accessToken := AccessTokenResponse{}
	err = json.NewDecoder(response.Body).Decode(&accessToken)
	if err != nil {
		return nil, err
	}
	return &accessToken, nil
}

func getLinkReport(link_id string, product_type string) (string, error) {
	log.Printf("TRUV: Requesting %[2]s report data from https://prod.truv.com/v1/links/%[1]s/%[2]s/report", link_id, product_type)
	log.Printf("TRUV: Link ID - %s\n", link_id)
	request, err := getRequest(fmt.Sprintf("links/%s/%s/report", link_id, product_type), "GET", nil)
	if err != nil {
		return "", err
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer response.Body.Close()
	data, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// createRefreshTask uses the given access token to request
// a task refresh
func createRefreshTask(access_token string) (string, error) {
	log.Println("TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks")
	log.Printf("TRUV: Access Token - %s\n", access_token)
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request, err := getRequest("refresh/tasks/", "POST", jsonAccessToken)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}

	res, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %v", err)
	}
	defer res.Body.Close()

	// Read response body
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %v", err)
	}

	// Check if response is empty
	if len(data) == 0 {
		return "", fmt.Errorf("received empty response from server")
	}

	// Log response status and body
	log.Printf("TRUV: Refresh task response status: %d\n", res.StatusCode)
	log.Printf("TRUV: Refresh task response body: %s\n", string(data))

	// Check status code - accept both 200 and 201 as success
	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("server returned non-success status code: %d, body: %s", res.StatusCode, string(data))
	}
	
	return string(data), nil
}

// getRefreshTask requests a task refresh update
func getRefreshTask(taskId string) (string, error) {
	log.Println("TRUV: Requesting a refresh task using a task_id from https://prod.truv.com/v1/refresh/tasks/{task_id}")
	log.Printf("TRUV: Task ID - %s\n", taskId)
	request, err := getRequest(fmt.Sprintf("refresh/tasks/%s", taskId), "GET", nil)
	if err != nil {
		return "", err
	}

	res, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}
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

	res, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}
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

	res, err := http.DefaultClient.Do(request)
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

	res, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
