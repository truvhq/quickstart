using System;
using System.Net.Http;
using System.Threading.Tasks;
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
      var account = productType == "fas" ? "\"account\": { \"account_number\": \"16002600\", \"account_type\": \"checking\", \"routing_number\": \"123456789\", \"bank_name\": \"TD Bank\" }," : "";
      Console.WriteLine("CITADEL: Requesting bridge token from https://prod.citadelid.com/v1/bridge-tokens");
      var body = "{ \"product_type\": \"" + productType + "\"," +
                 account +
                 " \"tracking_info\": \"1337\"," +
                 " \"client_name\": \"Citadel Quickstart\"" +
                 "}";
      return await SendRequest("bridge-tokens/", body);
    }

    public async Task<string> GetAccessToken(string publicToken)
    {
      Console.WriteLine("CITADEL: Exchanging a public_token for an access_token from https://prod.citadelid.com/v1/link-access-tokens");
      Console.WriteLine("CITADEL: Public Token - {0}", publicToken);
      return await SendRequest("link-access-tokens/", "{\"public_token\": \"" + publicToken + "\" }");
    }

    public async Task<string> GetEmploymentInfoByToken(string accessToken)
    {
      Console.WriteLine("CITADEL: Requesting employment verification data using an access_token from https://prod.citadelid.com/v1/verifications/employments");
      Console.WriteLine("CITADEL: Access Token - {0}", accessToken);
      return await SendRequest("verifications/employments/", "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string> GetIncomeInfoByToken(string accessToken)
    {
      Console.WriteLine("CITADEL: Requesting income verification data using an access_token from https://prod.citadelid.com/v1/verifications/incomes");
      Console.WriteLine("CITADEL: Access Token - {0}", accessToken);
      return await SendRequest("verifications/incomes/", "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string> GetEmployeeDirectoryByToken(string accessToken)
    {
      Console.WriteLine("CITADEL: Requesting employee directory data using an access_token from https://prod.citadelid.com/v1/administrators/directories");
      Console.WriteLine("CITADEL: Access Token - {0}", accessToken);
      return await SendRequest("administrators/directories/", "{\"access_token\": \"" + accessToken + "\" }");
    }

    public async Task<string> RequestPayrollReport(string accessToken, string startDate, string endDate)
    {
      Console.WriteLine("CITADEL: Requesting a payroll report be created using an access_token from https://prod.citadelid.com/v1/administrators/payrolls");
      Console.WriteLine("CITADEL: Access Token - {0}", accessToken);
      var body = "{ \"access_token\": \"" + accessToken + "\"," +
                 " \"start_date\": \"" + startDate + "\"," +
                 " \"end_date\": \"" + endDate + "\"" +
                 "}";
      var response = await SendRequest("administrators/payrolls/", body);
      var parsedResponse = JsonDocument.Parse(response);
      return parsedResponse.RootElement.GetProperty("payroll_report_id").GetString();
    }

    public async Task<string> GetPayrollById(string reportId)
    {
      Console.WriteLine("CITADEL: Requesting a payroll report using a report_id from https://prod.citadelid.com/v1/administrators/payrolls/{report_id}");
      Console.WriteLine("CITADEL: Report ID - {0}", reportId);
      return await SendRequest($"administrators/payrolls/{reportId}", "", "GET");
    }

    public async Task<string> GetFasStatusByToken(string accessToken)
    {
      Console.WriteLine("CITADEL: Requesting FAS update data using an access_token from https://prod.citadelid.com/v1/account-switches");
      Console.WriteLine("CITADEL: Access Token - {0}", accessToken);
      return await SendRequest($"account-switches", "{\"access_token\": \"" + accessToken + "\" }", "POST");
    }

    public async Task<string> CompleteFasFlowByToken(string accessToken, float first_micro, float second_micro)
    {
      Console.WriteLine("CITADEL: Completing FAS flow with a Task refresh using an access_token from https://prod.citadelid.com/v1/refresh/tasks");
      Console.WriteLine("CITADEL: Access Token - {0}", accessToken);
      return await SendRequest("refresh/tasks/", "{\"access_token\": \"" + accessToken + "\", \"settings\": { \"micro_deposits\": [" + first_micro.ToString() + ", " + second_micro.ToString() + "] } }");
    }
  }

  public class AccessTokenResponse
  {
    public List<string> access_tokens { get; set; }
  }
}