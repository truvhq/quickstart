using System;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;

namespace c_sharp {
  public class Citadel {

    private string clientId = Environment.GetEnvironmentVariable("API_CLIENT_ID");
    private string clientSecret = Environment.GetEnvironmentVariable("API_SECRET");
    private string apiUrl = Environment.GetEnvironmentVariable("API_URL");
    private readonly HttpClient client;

    public Citadel() {
      client = new HttpClient();
      client.DefaultRequestHeaders.Add("X-Access-Client-Id", clientId);
      client.DefaultRequestHeaders.Add("X-Access-Secret", clientSecret);
    }

    public async Task<string> SendRequest(string endpoint, string content = "", string method = "POST") {
      var request = new HttpRequestMessage {
        RequestUri = new Uri(apiUrl + endpoint),
        Method = method == "POST" ? HttpMethod.Post : HttpMethod.Get,
        Content = new StringContent(content, Encoding.UTF8, "application/json"),
      };
      var response = await client.SendAsync(request);
      return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> GetBridgeToken() {
      return await SendRequest("bridge-tokens/");
    }

    private async Task<string> GetAccessToken(string publicToken) {
      var response = await SendRequest("access-tokens/", "{\"public_tokens\": [\"" + publicToken + "\"] }");
      var parsedResponse = JsonDocument.Parse(response);
      return parsedResponse.RootElement.GetProperty("access_tokens").EnumerateArray().First().GetString();
    }

    public async Task<string>GetEmploymentInfoByToken(string publicToken) {
      var employmentVerificationUrl = "verifications/employments/";
      var accessToken = await GetAccessToken(publicToken);
      return await SendRequest(employmentVerificationUrl, "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string>GetIncomeInfoByToken(string publicToken) {
      var incomeVerificationUrl = "verifications/incomes/";
      var accessToken = await GetAccessToken(publicToken);
      return await SendRequest(incomeVerificationUrl, "{\"access_token\": \"" + accessToken + "\" }");
    }
  }

  public class AccessTokenResponse {
    public List<string> access_tokens { get; set; }
  }
}