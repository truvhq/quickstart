package main

import (
    "fmt"
    "log"
		"net/http"
		"io/ioutil"
		"os"
		"strings"
)

func check(e error) {
	if e != nil {
			panic(e)
	}
}

func homePage(w http.ResponseWriter, r *http.Request){
	productType := os.Getenv("API_PRODUCT_TYPE")
	dat, err := ioutil.ReadFile(fmt.Sprintf("../html/%s.html", productType))
	check(err)
	html := string(dat)
	html = strings.ReplaceAll(html, "{{ product_type }}", productType)
	html = strings.ReplaceAll(html, "{{ server_url }}", r.URL.Host)
  fmt.Fprintf(w, html)
}

func bridgeToken(w http.ResponseWriter, r *http.Request) {
	bridgeData := getBridgeToken()
	fmt.Fprintf(w, bridgeData)
}

func verifications(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken := getAccessToken(token)
	verificationResponse := ""
	if productType == "employment" {
		verificationResponse = getEmploymentInfoByToken(accessToken)
	} else {
		verificationResponse = getIncomeInfoByToken(accessToken)
	}
	fmt.Fprintf(w, verificationResponse)
}

func adminData(w http.ResponseWriter, r *http.Request) {
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken := getAccessToken(token)
	directory := getEmployeeDirectoryByToken(accessToken)
	report := requestPayrollReport(accessToken, "2020-01-01", "2020-10-31")
	reportId := report.PayrollReportId
	payroll := getPayrollById(reportId)

	data := fmt.Sprintf(`{ "directory": %s, "payroll": %s }`, directory, payroll)

	fmt.Fprintf(w, data)
}

func handleRequests() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/getBridgeToken", bridgeToken)
	http.HandleFunc("/getVerifications/", verifications)
	http.HandleFunc("/getAdminData/", adminData)

	fmt.Println(strings.Repeat("=", 40), "ENVIRONMENT", strings.Repeat("=", 40))
	fmt.Println(fmt.Sprintf("API_CLIENT_ID: %s", os.Getenv("API_CLIENT_ID")))
	fmt.Println(fmt.Sprintf("API_SECRET: %s", os.Getenv("API_SECRET")))
	fmt.Println(fmt.Sprintf("API_URL: %s", os.Getenv("API_URL")))
	fmt.Println(fmt.Sprintf("API_PRODUCT_TYPE: %s", os.Getenv("API_PRODUCT_TYPE")))
  fmt.Println(strings.Repeat("=", 94))
	fmt.Println("listening on port 5000")
	
  log.Fatal(http.ListenAndServe(":5000", nil))
}

func main() {
    handleRequests()
}