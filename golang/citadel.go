package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

type PublicTokenRequest struct {
	PublicTokens []string `json:"public_tokens"`
}

type AccessTokenRequest struct {
	AccessToken string `json:"access_token"`
}

type AccessTokenResponse struct {
	AccessTokens []string `json:"access_tokens"`
}

func getRequest(endpoint string, method string, body []byte) *http.Request {
	apiUrl := os.Getenv("API_URL")
	clientId := os.Getenv("API_CLIENT_ID")
	accessKey := os.Getenv("API_SECRET")
	fullEndpoint := fmt.Sprintf("%s%s", apiUrl, endpoint)
	request, _ := http.NewRequest(method, fullEndpoint, bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Access-Client-Id", clientId)
	request.Header.Set("X-Access-Secret", accessKey)
	return request
}

func getBridgeToken() string {
	request := getRequest("bridge-tokens/", "POST", nil)
	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	} else {
		data, _ := ioutil.ReadAll(response.Body)
		return (string(data))
	}
	return ""
}

func getAccessToken(public_token string) string {
	publicTokens := PublicTokenRequest{PublicTokens: []string{public_token}}
	jsonPublicTokens, _ := json.Marshal(publicTokens)
	accessTokens := AccessTokenResponse{}
	request := getRequest("access-tokens/", "POST", jsonPublicTokens)
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	}
	err = json.NewDecoder(res.Body).Decode(&accessTokens)
	if err != nil {
		panic(err)
	}
	return accessTokens.AccessTokens[0]
}

func getEmploymentInfoByToken(access_token string) string {
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request := getRequest("verifications/employments", "POST", jsonAccessToken)
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data)
}

func getIncomeInfoByToken(access_token string) string {
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request := getRequest("verifications/incomes", "POST", jsonAccessToken)
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data)
}

func getEmployeeDirectoryByToken(access_token string) string {
	accessToken := AccessTokenRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	request := getRequest("administrators/directories", "POST", jsonAccessToken)
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data)
}

type PayrollReportRequest struct {
	AccessToken string `json:"access_token"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
}

type PayrollReportResponse struct {
	PayrollReportId string `json:"payroll_report_id"`
}

func requestPayrollReport(access_token, start_date, end_date string) PayrollReportResponse {
	reportRequest := PayrollReportRequest{AccessToken: access_token, StartDate: start_date, EndDate: end_date}
	jsonReportRequest, _ := json.Marshal(reportRequest)
	payrollReport := PayrollReportResponse{}
	request := getRequest("administrators/payrolls", "POST", jsonReportRequest)
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	}
	err = json.NewDecoder(res.Body).Decode(&payrollReport)
	if err != nil {
		panic(err)
	}
	return payrollReport
}

func getPayrollById(reportId string) string {
	request := getRequest(fmt.Sprintf("administrators/payrolls/%s", reportId), "GET", nil)
	client := &http.Client{}
	res, err := client.Do(request)
	defer res.Body.Close()

	if err != nil {
		fmt.Printf("The HTTP request failed with error %s\n", err)
	}
	data, _ := ioutil.ReadAll(res.Body)
	return string(data)
}
