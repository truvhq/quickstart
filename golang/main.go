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
  fmt.Println("Endpoint Hit: homePage")
}

func bridgeToken(w http.ResponseWriter, r *http.Request) {
	bridgeData := getBridgeToken()
	fmt.Fprintf(w, bridgeData)
	fmt.Println("Endpoint Hit: bridgeToken")
}

func verifications(w http.ResponseWriter, r *http.Request) {
	productType := os.Getenv("API_PRODUCT_TYPE")
	splitPath := strings.Split(r.URL.Path, "/")
	token := splitPath[2]
	accessToken := getAccessToken(token)
	fmt.Println("Access Token:", accessToken)
	verificationResponse := ""
	if productType == "employment" {
		verificationResponse = getEmploymentInfoByToken(accessToken)
	} else {
		verificationResponse = getIncomeInfoByToken(accessToken)
	}
	fmt.Fprintf(w, verificationResponse)
}

func handleRequests() {
	http.HandleFunc("/", homePage)
	http.HandleFunc("/getBridgeToken", bridgeToken)
	http.HandleFunc("/getVerifications/", verifications)
  log.Fatal(http.ListenAndServe(":5000", nil))
}

func main() {
    handleRequests()
}