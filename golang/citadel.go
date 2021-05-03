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

// AccessTokenResponse is used to define the body for the
// response of requesting an access token
type AccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	LinkId string `json:"link_id"`
}

// PayrollReportRequest defines the body of the request when requesting
// a payroll report
type BridgeTokenRequest struct {
	ProductType  string `json:"product_type"`
	ClientName   string `json:"client_name"`
	TrackingInfo string `json:"tracking_info"`
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
	fmt.Printf("CITADEL: Public Token - %v\n", public_token)
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
	fmt.Printf("CITADEL: Access Token - %v\n", access_token)
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
	fmt.Printf("CITADEL: Access Token - %v\n", access_token)
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

// getEmployeeDirectoryByToken uses the given access token to request
// the associated employee directory info
func getEmployeeDirectoryByToken(access_token string) (string, error) {
	fmt.Println("CITADEL: Requesting employee directory data using an access_token from https://prod.citadelid.com/v1/administrators/directories")
	fmt.Printf("CITADEL: Access Token - %v\n", access_token)
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
	fmt.Printf("CITADEL: Access Token - %v\n", access_token)
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
	fmt.Printf("CITADEL: Report ID - %v\n", reportId)
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
