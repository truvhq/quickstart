using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("getDepositSwitchData")]
  public class DepositSwitchController : ControllerBase
  {

    private Citadel _citadel = new Citadel();

    [Route("{token}")]
    [HttpGet]
    public async Task<string> Get(string token)
    {
      var accessTokenResponse = await _citadel.GetAccessToken(token);
      var parsedResponse = JsonDocument.Parse(accessTokenResponse);
      var accessToken = parsedResponse.RootElement.GetProperty("access_token").GetString();

      return await _citadel.GetDepositSwitchByToken(accessToken);
    }
  }
}
