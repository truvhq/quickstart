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

var accessToken AccessTokenResponse

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

// verifications accepts requests for a verification and sends the response
func verifications(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]

	accessToken, err := getAccessToken(token)
	if err != nil {
		log.Println("Error getting access token", err)
		fmt.Fprint(w, `{ "success": false }`)
		return
	}

	verificationResponse, err := getLinkReport(accessToken.LinkId, productType)
	if err != nil {
		log.Println("Error getting verification", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, verificationResponse)
	}
}

type RefreshStatusResponse struct {
	Status string `json:"status"`
}

// verifications accepts requests for a verification and sends the response
func refresh(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")

	taskId, err := createRefreshTask(accessToken.AccessToken)
	if err != nil {
		log.Println("Error creating refresh task", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}

	finishedStatuses := []string{"done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"}
	refreshStatus, err := getRefreshTask(taskId)
	var refreshStatusResponse RefreshStatusResponse
	json.Unmarshal([]byte(refreshStatus), &refreshStatusResponse)
	_, found := find(finishedStatuses, refreshStatusResponse.Status)
	for found {
		log.Println("TRUV: Refresh task is not finished. Waiting 2 seconds, then checking again.")
		time.Sleep(2 * time.Second)
		refreshStatus, err = getRefreshTask(taskId)
		json.Unmarshal([]byte(refreshStatus), &refreshStatusResponse)
		_, found = find(finishedStatuses, refreshStatusResponse.Status)
	}

	log.Println("TRUV: Refresh task is finished. Pulling the latest data.")

	var refreshResponse string

	if productType == "employment" {
		refreshResponse, err = getLinkReport(accessToken.LinkId, productType)
	} else if productType == "income" {
		refreshResponse, err = getLinkReport(accessToken.LinkId, productType)
	} else if productType == "admin" {
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

		refreshResponse = fmt.Sprintf(`{ "directory": %s, "payroll": %s }`, directory, payroll)
	}
	if err != nil {
		log.Println("Error getting refresh data", err)
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
	b, _ := ioutil.ReadAll(r.Body)
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
	log.Println(strings.Repeat("=", 94))

	handleRequests()
}
