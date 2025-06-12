package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
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

var accessToken *AccessTokenResponse

// homePage writes the html page for the product type
// given in the API_PRODUCT_TYPE environment variable
func homePage(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	dat, err := ioutil.ReadFile(fmt.Sprintf("../html/%s.html", productType))
	check(err)
	html := string(dat)
	
	// Use a fixed server URL since we're running in Docker
	html = strings.ReplaceAll(html, "{{ server_url }}", r.URL.Host)
	
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

// bridgeToken accepts requests for a bridge token and sends the response
func bridgeToken(w http.ResponseWriter, r *http.Request) {
	isOrder := os.Getenv("IS_ORDER")
	
	if strings.ToLower(isOrder) == "true" {
		orderData, err := createOrder()
		if err != nil {
			log.Println("Error creating order", err)
			fmt.Fprintf(w, `{ "success": false }`)
			return
		}
		fmt.Fprintf(w, orderData)
	} else {
		userId, err := createUser()
		if err != nil {
			log.Println("Error creating user", err)
			fmt.Fprintf(w, `{ "success": false }`)
			return
		}

		bridgeData, err := createUserBridgeToken(userId)
		if err != nil {
			log.Println("Error in bridgeToken\n", err)
			fmt.Fprintf(w, `{ "success": false }`)
		} else {
			fmt.Fprintf(w, bridgeData)
		}
	}
}

// verifications accepts requests for a verification and sends the response
func verifications(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]

	var err error
	accessToken, err = getAccessToken(token)
	if err != nil {
		log.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false, "error": "Failed to get access token" }`)
		return
	}

	verificationResponse, err := getLinkReport(accessToken.LinkId, productType)
	if err != nil {
		log.Println("Error getting verification", err)
		fmt.Fprintf(w, `{ "success": false, "error": "Failed to get verification data" }`)
	} else {
		fmt.Fprintf(w, verificationResponse)
	}
}

type RefreshStatusResponse struct {
	Status string `json:"status"`
}

type RefreshTaskResponse struct {
	TaskId string `json:"task_id"`
}

// verifications accepts requests for a verification and sends the response
func refresh(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")

	// First validate that we have a valid access token
	if accessToken == nil || accessToken.AccessToken == "" {
		log.Println("Error: No access token available")
		fmt.Fprintf(w, `{ "success": false, "error": "No access token available. Please complete verification first." }`)
		return
	}

	// Create refresh task first
	taskResponseStr, err := createRefreshTask(accessToken.AccessToken)
	if err != nil {
		log.Printf("Error creating refresh task: %v\n", err)
		fmt.Fprintf(w, `{ "success": false, "error": "Failed to create refresh task: %v" }`, err)
		return
	}

	if taskResponseStr == "" {
		log.Println("Error: Empty response from create refresh task")
		fmt.Fprintf(w, `{ "success": false, "error": "Empty response from create refresh task" }`)
		return
	}

	log.Printf("Raw task response: %s\n", taskResponseStr)

	// Parse the task response
	var taskResponse CreateRefreshTaskResponse
	err = json.Unmarshal([]byte(taskResponseStr), &taskResponse)
	if err != nil {
		log.Printf("Error parsing task response: %v\nResponse was: %s\n", err, taskResponseStr)
		fmt.Fprintf(w, `{ "success": false, "error": "Failed to parse task response" }`)
		return
	}

	if taskResponse.TaskId == "" {
		log.Printf("Error: No task ID received in response: %s\n", taskResponseStr)
		fmt.Fprintf(w, `{ "success": false, "error": "No task ID received from refresh task creation" }`)
		return
	}

	log.Printf("Task ID received: %s\n", taskResponse.TaskId)

	// Now check the task status
	finishedStatuses := []string{"done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"}
	var refreshStatusResponse RefreshStatusResponse
	isFinished := false

	for !isFinished {
		refreshStatus, err := getRefreshTask(taskResponse.TaskId)
		if err != nil {
			log.Printf("Error getting refresh task status: %v\n", err)
			fmt.Fprintf(w, `{ "success": false, "error": "Failed to get refresh task status" }`)
			return
		}

		if refreshStatus == "" {
			log.Println("Error: Empty response from get refresh task status")
			fmt.Fprintf(w, `{ "success": false, "error": "Empty response from get refresh task status" }`)
			return
		}

		log.Printf("Raw refresh status: %s\n", refreshStatus)

		err = json.Unmarshal([]byte(refreshStatus), &refreshStatusResponse)
		if err != nil {
			log.Printf("Error parsing refresh status: %v\nStatus was: %s\n", err, refreshStatus)
			fmt.Fprintf(w, `{ "success": false, "error": "Failed to parse refresh status" }`)
			return
		}

		if refreshStatusResponse.Status == "" {
			log.Printf("Error: No status received in response: %s\n", refreshStatus)
			fmt.Fprintf(w, `{ "success": false, "error": "No status received in refresh task response" }`)
			return
		}

		_, found := find(finishedStatuses, refreshStatusResponse.Status)
		if found {
			isFinished = true
		} else {
			log.Printf("TRUV: Task %s is not finished (status: %s). Waiting 2 seconds, then checking again.", 
				taskResponse.TaskId, refreshStatusResponse.Status)
			time.Sleep(2 * time.Second)
		}
	}

	log.Println("TRUV: Refresh task is finished. Pulling the latest data.")

	var refreshResponse string

	if productType == "employment" || productType == "income" {
		refreshResponse, err = getLinkReport(accessToken.LinkId, productType)
	} else if productType == "admin" {
		directory, err := getEmployeeDirectoryByToken(accessToken.AccessToken)
		if err != nil {
			log.Println("Error getting Employee Directory", err)
			fmt.Fprintf(w, `{ "success": false, "error": "Failed to get employee directory" }`)
			return
		}
		
		// A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
		report, err := requestPayrollReport(accessToken.AccessToken, "2020-01-01", "2020-02-01")
		if err != nil {
			log.Println("Error requesting payroll report", err)
			fmt.Fprintf(w, `{ "success": false, "error": "Failed to request payroll report" }`)
			return
		}

		reportId := report.PayrollReportId
		payroll, err := getPayrollById(reportId)
		if err != nil {
			log.Println("Error getting payroll by id", err)
			fmt.Fprintf(w, `{ "success": false, "error": "Failed to get payroll by ID" }`)
			return
		}

		refreshResponse = fmt.Sprintf(`{ "directory": %s, "payroll": %s }`, directory, payroll)
	}
	if err != nil {
		log.Println("Error getting refresh data", err)
		fmt.Fprintf(w, `{ "success": false, "error": "Failed to get refresh data" }`)
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
	accessToken, err := getAccessToken(token)
	if err != nil {
		log.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	directory, err := getEmployeeDirectoryByToken(accessToken.AccessToken)
	if err != nil {
		log.Println("Error getting Employee Directory", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	// A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
	report, err := requestPayrollReport(accessToken.AccessToken, "2020-01-01", "2020-02-01")
	if err != nil {
		log.Println("Error requesting payroll report", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	reportId := report.PayrollReportId
	payroll, err := getPayrollById(reportId)
	if err != nil {
		log.Println("Error getting payroll by id", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}

	data := fmt.Sprintf(`{ "directory": %s, "payroll": %s }`, directory, payroll)

	fmt.Fprintf(w, data)
}

// getPaycheckLinkedLoanData retrieves pll data
func getPaycheckLinkedLoanData(w http.ResponseWriter, r *http.Request) {
	var err error
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err := getAccessToken(token)
	if err != nil {
		log.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	reportResponse, err := getLinkReport(accessToken.LinkId, "pll")
	if err != nil {
		log.Println("Error getting pll data", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, reportResponse)
	}
}

// getDepositSwitchData accepts requests for a deposit switch status and sends the response
func getDepositSwitchData(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err := getAccessToken(token)
	if err != nil {
		log.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	reportResponse, err := getLinkReport(accessToken.LinkId, "direct_deposit")
	if err != nil {
		log.Println("Error getting pll data", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, reportResponse)
	}
}

// checkEnv ensures all required environment variables have been set
func checkEnv() {
	clientId := os.Getenv("API_CLIENT_ID")
	if clientId == "" {
		log.Println("No API_CLIENT_ID provided")
		os.Exit(1)
	}
	accessKey := os.Getenv("API_SECRET")
	if accessKey == "" {
		log.Println("No API_SECRET provided")
		os.Exit(1)
	}
	productType := os.Getenv("API_PRODUCT_TYPE")
	if productType == "" {
		log.Println("No API_PRODUCT_TYPE provided")
		os.Exit(1)
	}
	if productType != "employment" && productType != "income" && productType != "admin" && productType != "pll" && productType != "deposit_switch" {
		log.Println("API_PRODUCT_TYPE must be one of employment, income, admin, deposit_switch or pll")
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
	b, err := io.ReadAll(r.Body)
	if err != nil {
		// handle error, e.g. return or log
	}
	convertedBody := string(b)
	var parsedJson WebhookRequest
	json.Unmarshal(b, &parsedJson)
	signature := generate_webhook_sign(convertedBody, os.Getenv("API_SECRET"))

	log.Println("TRUV: Webhook received")
	log.Printf("TRUV: Event type:      %s\n", parsedJson.EventType)
	log.Printf("TRUV: Status:          %s\n", parsedJson.Status)
	log.Printf("TRUV: Signature match: %t\n\n", r.Header.Get("X-WEBHOOK-SIGN") == signature)

	fmt.Fprintf(w, "")
}

// handleRequests sets up all endpoint handlers
func handleRequests() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/getBridgeToken", bridgeToken)
	http.HandleFunc("/getVerifications/", verifications)
	http.HandleFunc("/getAdminData/", adminData)
	http.HandleFunc("/getPaycheckLinkedLoanData/", getPaycheckLinkedLoanData)
	http.HandleFunc("/getDepositSwitchData/", getDepositSwitchData)
	http.HandleFunc("/createRefreshTask/", refresh)
	http.HandleFunc("/webhook", webhook)

	log.Println("Quickstart Loaded. Navigate to http://localhost:5003 to view Quickstart.")

	log.Fatal(http.ListenAndServe(":5003", nil))
}

func main() {
	checkEnv()

	log.Println(strings.Repeat("=", 40), "ENVIRONMENT", strings.Repeat("=", 40))
	log.Println(fmt.Sprintf("API_CLIENT_ID: %s", os.Getenv("API_CLIENT_ID")))
	log.Println(fmt.Sprintf("API_SECRET: %s", os.Getenv("API_SECRET")))
	log.Println(fmt.Sprintf("API_PRODUCT_TYPE: %s", os.Getenv("API_PRODUCT_TYPE")))
	log.Println(fmt.Sprintf("IS_ORDER: %s", os.Getenv("IS_ORDER")))
	log.Println(strings.Repeat("=", 94))

	handleRequests()
}
