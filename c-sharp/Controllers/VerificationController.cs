using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("getVerifications")]
  public class VerificationController : ControllerBase
  {

    private Citadel _citadel = new Citadel();
    private string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessToken = await _citadel.GetAccessToken(token);
      if (_productType == "employment")
      {
        return await _citadel.GetEmploymentInfoByToken(accessToken);
      }
      else
      {
        return await _citadel.GetIncomeInfoByToken(accessToken);
      }
    }
  }
}
