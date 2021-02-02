package main

import (
	"fmt"
	"net/http"
	"io/ioutil"
	"encoding/json"
	"os"
	"bytes"
)

type AccessTokenRequest struct {
	PublicTokens []string `json:"public_tokens"`
}

type VerificationRequest struct {
	AccessToken string `json:"access_token"`
}

type AccessTokenResponse struct {
	AccessTokens []string `json:"access_tokens"`
}

func getRequest(endpoint string, method string, body []byte) (*http.Request) {
	apiUrl := os.Getenv("API_URL")
	clientId := os.Getenv("API_CLIENT_ID")
	accessKey := os.Getenv("API_SECRET")
	fullEndpoint := fmt.Sprintf("%s%s", apiUrl, endpoint)
	fmt.Println("Full Endpoint: %s", fullEndpoint)
	request, _ := http.NewRequest(method, fullEndpoint, bytes.NewBuffer(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Access-Client-Id", clientId)
	request.Header.Set("X-Access-Secret", accessKey)
	return request
}

func getBridgeToken() (string) {
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

func getAccessToken(public_token string) (string) {
	publicTokens := AccessTokenRequest{PublicTokens: []string{public_token}}
	jsonPublicTokens, _ := json.Marshal(publicTokens)
	fmt.Println("Request Body", string(jsonPublicTokens))
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
		responseBody, _ := json.Marshal(accessTokens)
		fmt.Println("Here we go", string(responseBody))
    return accessTokens.AccessTokens[0]
}

func getEmploymentInfoByToken(access_token string) (string) {
	accessToken := VerificationRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	fmt.Println("Employment Body", string(jsonAccessToken))
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

func getIncomeInfoByToken(access_token string) (string) {
	accessToken := VerificationRequest{AccessToken: access_token}
	jsonAccessToken, _ := json.Marshal(accessToken)
	fmt.Println("Employment Body", string(jsonAccessToken))
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