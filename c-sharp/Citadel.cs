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

namespace c_sharp
{
  public class Citadel
  {

    private string clientId = Environment.GetEnvironmentVariable("API_CLIENT_ID");
    private string clientSecret = Environment.GetEnvironmentVariable("API_SECRET");
    private string productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");
    private readonly HttpClient client;

    public Citadel()
    {
      client = new HttpClient();
      client.DefaultRequestHeaders.Add("X-Access-Client-Id", clientId);
      client.DefaultRequestHeaders.Add("X-Access-Secret", clientSecret);
    }

    public async Task<string> SendRequest(string endpoint, string content = "", string method = "POST")
    {
      var request = new HttpRequestMessage
      {
        RequestUri = new Uri("https://prod.citadelid.com/v1/" + endpoint),
        Method = method == "POST" ? HttpMethod.Post : HttpMethod.Get,
        Content = new StringContent(content, Encoding.UTF8, "application/json"),
      };
      var response = await client.SendAsync(request);
      return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> GetBridgeToken()
    {
      var body = "{ \"product_type\": \"" + productType + "\"," +
                 " \"tracking_info\": \"1337\"," +
                 " \"client_name\": \"Citadel Quickstart\"" +
                 "}";
      return await SendRequest("bridge-tokens/", body);
    }

    public async Task<string> GetAccessToken(string publicToken)
    {
      var response = await SendRequest("access-tokens/", "{\"public_tokens\": [\"" + publicToken + "\"] }");
      var parsedResponse = JsonDocument.Parse(response);
      return parsedResponse.RootElement.GetProperty("access_tokens").EnumerateArray().First().GetString();
    }

    public async Task<string> GetEmploymentInfoByToken(string accessToken)
    {
      return await SendRequest("verifications/employments/", "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string> GetIncomeInfoByToken(string accessToken)
    {
      return await SendRequest("verifications/incomes/", "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string> GetEmployeeDirectoryByToken(string accessToken)
    {
      return await SendRequest("administrators/directories/", "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string> RequestPayrollReport(string accessToken, string startDate, string endDate)
    {
      var body = "{ \"access_token\": \"" + accessToken + "\"," +
                 " \"start_date\": \"" + startDate + "\"," +
                 " \"end_date\": \"" + endDate + "\"" +
                 "}";
      Console.WriteLine(body);
      var response = await SendRequest("administrators/payrolls/", body);
      Console.WriteLine(response);
      var parsedResponse = JsonDocument.Parse(response);
      return parsedResponse.RootElement.GetProperty("payroll_report_id").GetString();
    }

    public async Task<string> GetPayrollById(string reportId)
    {
      return await SendRequest($"administrators/payrolls/{reportId}", "", "GET");
    }
  }

  public class AccessTokenResponse
  {
    public List<string> access_tokens { get; set; }
  }
}