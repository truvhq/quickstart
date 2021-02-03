package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func homePage(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	dat, err := ioutil.ReadFile(fmt.Sprintf("../html/%s.html", productType))
	check(err)
	html := string(dat)
	html = strings.ReplaceAll(html, "{{ product_type }}", productType)
	html = strings.ReplaceAll(html, "{{ server_url }}", r.URL.Host)
	fmt.Fprintf(w, html)
}

func bridgeToken(w http.ResponseWriter, r *http.Request) {
	bridgeData, err := getBridgeToken()
	if err != nil {
		fmt.Println("Error in bridgeToken\n", err)
		fmt.Fprintf(w, `{ "success": false }`)
	} else {
		fmt.Fprintf(w, bridgeData)
	}
}

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
	report, err := requestPayrollReport(accessToken, "2020-01-01", "2020-10-31")
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

func checkEnv() {
	apiUrl := os.Getenv("API_URL")
	if apiUrl == "" {
		fmt.Println("No API_URL provided")
		os.Exit(1)
	}
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
	if productType != "employment" && productType != "income" && productType != "admin" {
		fmt.Println("API_PRODUCT_TYPE must be one of employment, income or admin")
		os.Exit(1)
	}
}

func handleRequests() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/getBridgeToken", bridgeToken)
	http.HandleFunc("/getVerifications/", verifications)
	http.HandleFunc("/getAdminData/", adminData)

	fmt.Println("listening on port 5000")

	log.Fatal(http.ListenAndServe(":5000", nil))
}

func main() {
	checkEnv()

	fmt.Println(strings.Repeat("=", 40), "ENVIRONMENT", strings.Repeat("=", 40))
	fmt.Println(fmt.Sprintf("API_CLIENT_ID: %s", os.Getenv("API_CLIENT_ID")))
	fmt.Println(fmt.Sprintf("API_SECRET: %s", os.Getenv("API_SECRET")))
	fmt.Println(fmt.Sprintf("API_URL: %s", os.Getenv("API_URL")))
	fmt.Println(fmt.Sprintf("API_PRODUCT_TYPE: %s", os.Getenv("API_PRODUCT_TYPE")))
	fmt.Println(strings.Repeat("=", 94))

	handleRequests()
}
