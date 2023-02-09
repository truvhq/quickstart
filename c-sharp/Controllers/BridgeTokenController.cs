using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
    [ApiController]
    [Route("getBridgeToken")]
    public class BridgeTokenController : ControllerBase
    {

        private Truv _truv = new Truv();

        [HttpGet]
        public async Task<string> Get()
        {
            var userId = await _truv.CreateUser();
            return await _truv.CreateUserBridgeToken(userId);
        }
    }
}
