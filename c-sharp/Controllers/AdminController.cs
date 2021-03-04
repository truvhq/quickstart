using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("getAdminData")]
  public class AdminController : ControllerBase
  {

    private Citadel _citadel = new Citadel();

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessToken = await _citadel.GetAccessToken(token);
      var directory = await _citadel.GetEmployeeDirectoryByToken(accessToken);
      var reportId = await _citadel.RequestPayrollReport(accessToken, "2020-01-01", "2020-02-01");
      var payroll = await _citadel.GetPayrollById(reportId);
      var finalResponse = "{ \"directory\": " + directory + ", \"payroll\": " + payroll + "}";
      return finalResponse;
    }
  }
}
