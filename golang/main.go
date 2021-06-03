package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

// check will cause a panic if there an error given
func check(e error) {
	if e != nil {
		panic(e)
	}
}

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
	productType := os.Getenv("API_PRODUCT_TYPE")
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err := getAccessToken(token)
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

// adminData accepts requests for admin data and sends the response
func adminData(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err := getAccessToken(token)
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

var accessToken string
var err error

// startFasFlow retrieves FAS data
func startFasFlow(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken, err = getAccessToken(token)
	fmt.Println(accessToken)
	if err != nil {
		fmt.Println("Error getting access token", err)
		fmt.Fprintf(w, `{ "success": false }`)
		return
	}
	fasResponse, err := getFasStatusByToken(accessToken)
	if err != nil {
		fmt.Println("Error getting FAS Status", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, fasResponse)
	}
}

// completeFasFlow finishes the FAS flow with two micro deposit values
func completeFasFlow(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	first_micro, _ := strconv.ParseFloat(splitPath[2], 32)
	second_micro, _ := strconv.ParseFloat(splitPath[3], 32)

	fasResponse, err := completeFasFlowByToken(accessToken, float32(first_micro), float32(second_micro))
	if err != nil {
		fmt.Println("Error getting FAS Status", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, fasResponse)
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
	if productType != "employment" && productType != "income" && productType != "admin" && productType != "fas" {
		fmt.Println("API_PRODUCT_TYPE must be one of employment, income, admin or fas")
		os.Exit(1)
	}
}

// handleRequests sets up all endpoint handlers
func handleRequests() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/getBridgeToken", bridgeToken)
	http.HandleFunc("/getVerifications/", verifications)
	http.HandleFunc("/getAdminData/", adminData)
	http.HandleFunc("/startFasFlow/", startFasFlow)
	http.HandleFunc("/completeFasFlow/", completeFasFlow)

	fmt.Println("Quickstart Loaded. Navigate to http://localhost:5000 to view Quickstart.")

	log.Fatal(http.ListenAndServe(":5000", nil))
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
