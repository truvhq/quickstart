using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
    [ApiController]
    [Route("getDepositSwitchData")]
    public class DepositSwitchController : ControllerBase
    {
        private Truv _truv = new Truv();

        [Route("{token}")]
        [HttpGet]
        public async Task<string> Get(string token)
        {
            var accessToken = await _truv.GetAccessToken(token);
            return await _truv.GetDepositSwitchByToken(accessToken);
        }
    }
}
