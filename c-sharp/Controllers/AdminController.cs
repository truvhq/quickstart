using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("getAdminData")]
  public class AdminController : ControllerBase
  {

    private Truv _truv = new Truv();

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessTokenResponse = await _truv.GetAccessToken(token);
      var parsedResponse = JsonDocument.Parse(accessTokenResponse);
      var accessToken = parsedResponse.RootElement.GetProperty("access_token").GetString();

      var directory = await _truv.GetEmployeeDirectoryByToken(accessToken);
      // A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
      var reportId = await _truv.RequestPayrollReport(accessToken, "2020-01-01", "2020-02-01");
      var payroll = await _truv.GetPayrollById(reportId);
      var finalResponse = "{ \"directory\": " + directory + ", \"payroll\": " + payroll + "}";
      return finalResponse;
    }
  }
}
