package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// check will cause a panic if there an error given
func check(e error) {
	if e != nil {
		panic(e)
	}
}

var accessToken string

// homePage writes the html page for the product type
// given in the API_PRODUCT_TYPE environment variable
func homePage(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	dat, err := ioutil.ReadFile(fmt.Sprintf("../html/%s.html", productType))
	check(err)
	html := string(dat)
	html = strings.ReplaceAll(html, "{{ server_url }}", r.URL.Host)
	fmt.Fprintf(w, html)
}

// bridgeToken accepts requests for a bridge token and sends the response
func bridgeToken(w http.ResponseWriter, r *http.Request) {
	bridgeData, err := getBridgeToken()
	if err != nil {
		fmt.Println("Error in bridgeToken\n", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, bridgeData)
	}
}

// verifications accepts requests for a verification and sends the response
func verifications(w http.ResponseWriter, r *http.Request) {
	var err error
	productType := os.Getenv("API_PRODUCT_TYPE")
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err = getAccessToken(token)
	if err != nil {
		fmt.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	verificationResponse := ""
	if productType == "employment" {
		verificationResponse, err = getEmploymentInfoByToken(accessToken)
	} else {
		verificationResponse, err = getIncomeInfoByToken(accessToken)
	}
	if err != nil {
		fmt.Println("Error getting verification", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, verificationResponse)
	}
}

type RefreshStatusResponse struct {
	Status    string `json:"status"`
}
// verifications accepts requests for a verification and sends the response
func refresh(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	
	taskId, err := createRefreshTask(accessToken)

	if err != nil {
		fmt.Println("Error creating refresh task", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}

	finishedStatuses := []string{"done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"}
	refreshStatus, err := getRefreshTask(taskId)
	var refreshStatusResponse RefreshStatusResponse
	json.Unmarshal([]byte(refreshStatus), &refreshStatusResponse)
	_, found := find(finishedStatuses, refreshStatusResponse.Status)
	for found {
		fmt.Println("CITADEL: Refresh task is not finished. Waiting 2 seconds, then checking again.")
		time.Sleep(2 * time.Second)
		refreshStatus, err = getRefreshTask(taskId)
		json.Unmarshal([]byte(refreshStatus), &refreshStatusResponse)
		_, found = find(finishedStatuses, refreshStatusResponse.Status)
	}

	fmt.Println("CITADEL: Refresh task is finished. Pulling the latest data.")

	refreshResponse := ""
	if productType == "employment" {
		refreshResponse, err = getEmploymentInfoByToken(accessToken)
	} else if productType == "income" {
		refreshResponse, err = getIncomeInfoByToken(accessToken)
	} else if productType == "admin" {
		directory, err := getEmployeeDirectoryByToken(accessToken)
		if err != nil {
			fmt.Println("Error getting Employee Directory", err)
			fmt.Fprintf(w, `{ "success": false }`)
			return
		}
		// A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
		report, err := requestPayrollReport(accessToken, "2020-01-01", "2020-02-01")
		if err != nil {
			fmt.Println("Error requesting payroll report", err)
			fmt.Fprintf(w, `{ "success": false }`)
			return
		}
		reportId := report.PayrollReportId
		payroll, err := getPayrollById(reportId)
		if err != nil {
			fmt.Println("Error getting payroll by id", err)
			fmt.Fprintf(w, `{ "success": false }`)
			return
		}

		refreshResponse = fmt.Sprintf(`{ "directory": %s, "payroll": %s }`, directory, payroll)
	}
	if err != nil {
		fmt.Println("Error getting refresh data", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, refreshResponse)
	}
}

func find(slice []string, val string) (int, bool) {
	for i, item := range slice {
		if item == val {
			return i, true
		}
	}
	return -1, false
}

// adminData accepts requests for admin data and sends the response
func adminData(w http.ResponseWriter, r *http.Request) {
	var err error
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err = getAccessToken(token)
	if err != nil {
		fmt.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	directory, err := getEmployeeDirectoryByToken(accessToken)
	if err != nil {
		fmt.Println("Error getting Employee Directory", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	// A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
	report, err := requestPayrollReport(accessToken, "2020-01-01", "2020-02-01")
	if err != nil {
		fmt.Println("Error requesting payroll report", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	reportId := report.PayrollReportId
	payroll, err := getPayrollById(reportId)
	if err != nil {
		fmt.Println("Error getting payroll by id", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}

	data := fmt.Sprintf(`{ "directory": %s, "payroll": %s }`, directory, payroll)

	fmt.Fprintf(w, data)
}

// startFundingSwitchFlow retrieves funding switch data
func startFundingSwitchFlow(w http.ResponseWriter, r *http.Request) {
	var err error
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err = getAccessToken(token)
	if err != nil {
		fmt.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	fundingSwitchResponse, err := getFundingSwitchStatusByToken(accessToken)
	if err != nil {
		fmt.Println("Error getting funding switch Status", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, fundingSwitchResponse)
	}
}

// completeFundingSwitchFlow finishes the funding switch flow with two micro deposit values
func completeFundingSwitchFlow(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	first_micro := splitPath[2]
	second_micro := splitPath[3]

	fundingSwitchResponse, err := completeFundingSwitchFlowByToken(accessToken, first_micro, second_micro)
	if err != nil {
		fmt.Println("Error getting funding switch Status", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, fundingSwitchResponse)
	}
}

// depositSwitch accepts requests for a deposit switch status and sends the response
func depositSwitch(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err := getAccessToken(token)
	if err != nil {
		fmt.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	depositSwitchResponse, err := getDepositSwitchByToken(accessToken)
	
	if err != nil {
		fmt.Println("Error getting deposit switch", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, depositSwitchResponse)
	}
}

// checkEnv ensures all required environment variables have been set
func checkEnv() {
	clientId := os.Getenv("API_CLIENT_ID")
	if clientId == "" {
		fmt.Println("No API_CLIENT_ID provided")
		os.Exit(1)
	}
	accessKey := os.Getenv("API_SECRET")
	if accessKey == "" {
		fmt.Println("No API_SECRET provided")
		os.Exit(1)
	}
	productType := os.Getenv("API_PRODUCT_TYPE")
	if productType == "" {
		fmt.Println("No API_PRODUCT_TYPE provided")
		os.Exit(1)
	}
	if productType != "employment" && productType != "income" && productType != "admin" && productType != "fas" && productType != "deposit_switch" {
		fmt.Println("API_PRODUCT_TYPE must be one of employment, income, admin, deposit_switch or fas")
		os.Exit(1)
	}
}

func generate_webhook_sign(body string, key string) string {

	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(body))
	return fmt.Sprintf("v1=%s", hex.EncodeToString(mac.Sum(nil)))
}

type WebhookRequest struct {
	EventType string `json:"event_type"`
	Status    string `json:"status"`
}

func webhook(w http.ResponseWriter, r *http.Request) {
	b, _ := ioutil.ReadAll(r.Body)
	convertedBody := string(b)
	var parsedJson WebhookRequest
	json.Unmarshal(b, &parsedJson)
	signature := generate_webhook_sign(convertedBody, os.Getenv("API_SECRET"))

	fmt.Println("CITADEL: Webhook received")
	fmt.Printf("CITADEL: Event type:      %s\n", parsedJson.EventType)
	fmt.Printf("CITADEL: Status:          %s\n", parsedJson.Status)
	fmt.Printf("CITADEL: Signature match: %t\n\n", r.Header.Get("X-WEBHOOK-SIGN") == signature)

	fmt.Fprintf(w, "")
}

// handleRequests sets up all endpoint handlers
func handleRequests() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/getBridgeToken", bridgeToken)
	http.HandleFunc("/getVerifications/", verifications)
	http.HandleFunc("/getAdminData/", adminData)
	http.HandleFunc("/startFundingSwitchFlow/", startFundingSwitchFlow)
	http.HandleFunc("/completeFundingSwitchFlow/", completeFundingSwitchFlow)
	http.HandleFunc("/getDepositSwitchData/", depositSwitch)
	http.HandleFunc("/createRefreshTask/", refresh)
	http.HandleFunc("/webhook", webhook)

	fmt.Println("Quickstart Loaded. Navigate to http://localhost:5010 to view Quickstart.")

	log.Fatal(http.ListenAndServe(":5010", nil))
}

func main() {
	checkEnv()

	fmt.Println(strings.Repeat("=", 40), "ENVIRONMENT", strings.Repeat("=", 40))
	fmt.Println(fmt.Sprintf("API_CLIENT_ID: %s", os.Getenv("API_CLIENT_ID")))
	fmt.Println(fmt.Sprintf("API_SECRET: %s", os.Getenv("API_SECRET")))
	fmt.Println(fmt.Sprintf("API_PRODUCT_TYPE: %s", os.Getenv("API_PRODUCT_TYPE")))
	fmt.Println(strings.Repeat("=", 94))

	handleRequests()
}
