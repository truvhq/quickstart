using System.Text.Json;
using System.Text.Json.Serialization;

namespace c_sharp
{
    public class Truv
    {
        private static string accessToken = null;
        private static AccessTokenResponse linkToken = null;
        private readonly string clientId = Environment.GetEnvironmentVariable("API_CLIENT_ID");
        private readonly string clientSecret = Environment.GetEnvironmentVariable("API_SECRET");
        private readonly string productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");
        private readonly string isOrder = Environment.GetEnvironmentVariable("IS_ORDER");

        private readonly HttpClient client;

        public Truv()
        {
            client = new HttpClient();
            client.DefaultRequestHeaders.Add("X-Access-Client-Id", clientId);
            client.DefaultRequestHeaders.Add("X-Access-Secret", clientSecret);
        }

        public async Task<string> SendRequest(HttpMethod method, string endpoint, object content = null)
        {
            var request = new HttpRequestMessage
            {
                RequestUri = new Uri("https://prod.truv.com/v1/" + endpoint),
                Method = method
            };

            if (content != null)
            {
                request.Content = JsonContent.Create(content);
            }

            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> CreateUser()
        {
            Console.WriteLine("TRUV: Requesting new user from https://prod.truv.com/v1/users/");
            string uuid = Guid.NewGuid().ToString();
            var body = new UserRequest
            {
                ExternalUserId = $"qs-{uuid}",
                FirstName = "John",
                LastName = "Johnson",
                Email = "j.johnson@example.com",
            };
            var response = await SendRequest(HttpMethod.Post, "users/", body);
            UserResponse userResponse = JsonSerializer.Deserialize<UserResponse>(response);
            return userResponse.UserId;
        }

        public async Task<string> CreateUserBridgeToken(string UserId)
        {
            Console.WriteLine("TRUV: Requesting user bridge token from https://prod.truv.com/v1/users/{user_id}/tokens/");
            var body = new BridgeTokenRequest
            {
                ProductType = productType,
                TrackingInfo = "1338-0111-A",
            };

            if (productType == "pll" || productType == "deposit_switch")
            {
                body.Account = new AccountRequest
                {
                    AccountNumber = "16002600",
                    AccountType = "checking",
                    RountingNumber = "123456789",
                    BankName = "TD Bank"
                };

                if (productType == "pll")
                {
                    body.Account.DepositType = "amount";
                    body.Account.DepositValue = "100";
                }
            }
            return await SendRequest(HttpMethod.Post, $"users/{UserId}/tokens/", body);
        }

        public async Task<string> CreateOrder()
        {
            Console.WriteLine("TRUV: Requesting an order from https://prod.truv.com/v1/orders/");
            string uuid = Guid.NewGuid().ToString();
            
            var body = new OrderRequest
            {
                OrderNumber = $"qs-{uuid}",
                FirstName = "John",
                LastName = "Johnson",
                Email = "j.johnson@example.com",
                Products = new[] { productType }
            };

            // Add employers for certain product types
            if (productType == "deposit_switch" || productType == "pll" || productType == "employment")
            {
                var employer = new EmployerRequest
                {
                    CompanyName = "Home Depot"
                };

                // Add account information for deposit_switch and pll
                if (productType == "deposit_switch" || productType == "pll")
                {
                    employer.Account = new AccountRequest
                    {
                        AccountNumber = "16002600",
                        AccountType = "checking",
                        RountingNumber = "12345678",
                        BankName = "Truv Bank"
                    };

                    if (productType == "pll")
                    {
                        employer.Account.DepositType = "amount";
                        employer.Account.DepositValue = "100";
                    }
                }

                body.Employers = new[] { employer };
            }

            return await SendRequest(HttpMethod.Post, "orders/", body);
        }

        public async Task<string> GetAccessToken(string publicToken)
        {
            Console.WriteLine("TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens");
            Console.WriteLine("TRUV: Public Token - {0}", publicToken);

            var body = new PublicTokenRequest { PublicToken = publicToken };
            var response = await SendRequest(HttpMethod.Post, "link-access-tokens/", body);

            AccessTokenResponse accessTokenResponse = JsonSerializer.Deserialize<AccessTokenResponse>(response);
            Truv.accessToken = accessTokenResponse.AccessToken;

            return accessTokenResponse.AccessToken;
        }

        public async Task<AccessTokenResponse> GetLinkToken(string publicToken)
        {
            Console.WriteLine("TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens");
            Console.WriteLine("TRUV: Public Token - {0}", publicToken);

            var body = new PublicTokenRequest { PublicToken = publicToken };
            var response = await SendRequest(HttpMethod.Post, "link-access-tokens/", body);

            AccessTokenResponse accessTokenResponse = JsonSerializer.Deserialize<AccessTokenResponse>(response);
            Truv.linkToken = accessTokenResponse;
            Truv.accessToken = accessTokenResponse.AccessToken;

            return Truv.linkToken;
        }

        public async Task<string> GetLinkReport(string linkId, string productType)
        {
            linkId ??= Truv.linkToken.LinkId;
            Console.WriteLine("TRUV: Requesting {0} report  from https://prod.truv.com/v1/links/{1}/{0}/report", productType, linkId);
            Console.WriteLine("TRUV: Link ID - {0}", linkId);
            return await SendRequest(HttpMethod.Get, $"links/{linkId}/{productType}/report");
        }

        public async Task<string> CreateRefreshTask()
        {
            var accessToken = Truv.accessToken;
            Console.WriteLine("TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks/");
            Console.WriteLine("TRUV: Access Token - {0}", accessToken);
            var body = new AccessTokenRequest { AccessToken = accessToken };
            return await SendRequest(HttpMethod.Post, "refresh/tasks/", body);
        }

        public async Task<string> GetRefreshTask(string taskId)
        {
            Console.WriteLine("TRUV: Requesting a refresh task using a task_id from https://prod.truv.com/v1/refresh/tasks/{task_id}/");
            Console.WriteLine("TRUV: Task ID - {0}", taskId);
            return await SendRequest(HttpMethod.Get, $"refresh/tasks/{taskId}/");
        }

        public async Task<string> GetEmployeeDirectoryByToken(string accessToken)
        {
            accessToken ??= Truv.accessToken;
            Console.WriteLine("TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/link/reports/admin/");
            Console.WriteLine("TRUV: Access Token - {0}", accessToken);
            var body = new AccessTokenRequest { AccessToken = accessToken };
            return await SendRequest(HttpMethod.Post, "link/reports/admin/", body);
        }

        public async Task<string> RequestPayrollReport(string accessToken, string startDate, string endDate)
        {
            accessToken ??= Truv.accessToken;
            Console.WriteLine("TRUV: Requesting a payroll report be created using an access_token from https://prod.truv.com/v1/administrators/payrolls");
            Console.WriteLine("TRUV: Access Token - {0}", accessToken);
            var body = new PayrollReportRequest { AccessToken = accessToken, StartDate = startDate, EndDate = endDate };
            var response = await SendRequest(HttpMethod.Post, "administrators/payrolls/", body);

            PayrollReportResponse payrollReportResponse = JsonSerializer.Deserialize<PayrollReportResponse>(response);
            return payrollReportResponse.PayrollReportId;
        }

        public async Task<string> GetPayrollById(string reportId)
        {
            Console.WriteLine("TRUV: Requesting a payroll report using a report_id from https://prod.truv.com/v1/administrators/payrolls/{report_id}");
            Console.WriteLine("TRUV: Report ID - {0}", reportId);
            return await SendRequest(HttpMethod.Get, $"administrators/payrolls/{reportId}/");
        }
    }


    public class AccessTokenRequest
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }
    }

    public class AccessTokenResponse
    { 
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }

        [JsonPropertyName("link_id")]
        public string LinkId { get; set; }
    }

    public class PublicTokenRequest
    {
        [JsonPropertyName("public_token")]
        public string PublicToken { get; set; }
    }

    public class PayrollReportRequest
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }

        [JsonPropertyName("start_date")]
        public string StartDate { get; set; }

        [JsonPropertyName("end_date")]
        public string EndDate { get; set; }
    }

    public class PayrollReportResponse
    {
        [JsonPropertyName("payroll_report_id")]
        public string PayrollReportId { get; set; }
    }

    public class UserRequest
    {
        [JsonPropertyName("external_user_id")]
        public string ExternalUserId { get; set; }

        [JsonPropertyName("first_name")]
        public string FirstName { get; set; }

        [JsonPropertyName("last_name")]
        public string LastName { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; }
    }

    public class UserResponse
    {
        [JsonPropertyName("id")]
        public string UserId { get; set; }
    }

    public class AccountRequest
    {
        [JsonPropertyName("account_number")]
        public string AccountNumber { get; set; }

        [JsonPropertyName("account_type")]
        public string AccountType { get; set; }

        [JsonPropertyName("routing_number")]
        public string RountingNumber { get; set; }

        [JsonPropertyName("bank_name")]
        public string BankName { get; set; }

#nullable enable
        [JsonPropertyName("deposit_type")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DepositType { get; set; }

        [JsonPropertyName("deposit_value")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DepositValue { get; set; }

#nullable disable
    }

    public class BridgeTokenRequest
    {
        [JsonPropertyName("product_type")]
        public string ProductType { get; set; }

        [JsonPropertyName("tracking_info")]
        public string TrackingInfo { get; set; }

        [JsonPropertyName("client_name")]
        public string ClientName { get; set; }

#nullable enable
        [JsonPropertyName("account")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public AccountRequest? Account { get; set; }

#nullable disable
    }

    public class OrderRequest
    {
        [JsonPropertyName("order_number")]
        public string OrderNumber { get; set; }

        [JsonPropertyName("first_name")]
        public string FirstName { get; set; }

        [JsonPropertyName("last_name")]
        public string LastName { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; }

        [JsonPropertyName("products")]
        public string[] Products { get; set; }

#nullable enable
        [JsonPropertyName("employers")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public EmployerRequest[]? Employers { get; set; }

#nullable disable
    }

    public class EmployerRequest
    {
        [JsonPropertyName("company_name")]
        public string CompanyName { get; set; }

#nullable enable
        [JsonPropertyName("account")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public AccountRequest? Account { get; set; }

#nullable disable
    }
}