using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("getVerifications")]
  public class VerificationController : ControllerBase
  {

    private Truv _truv = new Truv();
    private string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessTokenResponse = await _truv.GetAccessToken(token);
      var parsedResponse = JsonDocument.Parse(accessTokenResponse);
      var accessToken = parsedResponse.RootElement.GetProperty("access_token").GetString();

      if (_productType == "employment")
      {
        return await _truv.GetEmploymentInfoByToken(accessToken);
      }
      else
      {
        return await _truv.GetIncomeInfoByToken(accessToken);
      }
    }
  }
}
