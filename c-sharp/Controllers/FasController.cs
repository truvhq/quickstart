using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("")]
  public class FasController : ControllerBase
  {
    private static string accessToken = null;
    private Citadel _citadel = new Citadel();

    [Route("startFasFlow/{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessTokenResponse = await _citadel.GetAccessToken(token);
      var parsedResponse = JsonDocument.Parse(accessTokenResponse);
      accessToken = parsedResponse.RootElement.GetProperty("access_token").GetString();
      
      return await _citadel.GetFasStatusByToken(accessToken);
    }

    [Route("completeFasFlow/{first_micro}/{second_micro}")]
    [HttpGet]
    public async Task<string> Get(float first_micro, float second_micro)
    {
      return await _citadel.CompleteFasFlowByToken(accessToken, first_micro, second_micro);
    }
  }
}
