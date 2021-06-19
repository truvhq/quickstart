using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("getAdminData")]
  public class AdminController : ControllerBase
  {

    private Citadel _citadel = new Citadel();
    private string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessTokenResponse = await _citadel.GetAccessToken(token);
      var parsedResponse = JsonDocument.Parse(accessTokenResponse);
      var accessToken = parsedResponse.RootElement.GetProperty("access_token").GetString();

      // admin-directory means return the employee directory
      if (_productType == "admin-directory") {
        return await _citadel.GetEmployeeDirectoryByToken(accessToken);
      }

      // admin-report means return a payroll report
      var reportId = await _citadel.RequestPayrollReport(accessToken, "2020-01-01", "2020-02-01");
      return await _citadel.GetPayrollById(reportId);
    }
  }
}
