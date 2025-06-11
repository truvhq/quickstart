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
            var isOrder = Environment.GetEnvironmentVariable("IS_ORDER");
            
            if (!string.IsNullOrEmpty(isOrder) && isOrder.ToLower() == "true")
            {
                return await _truv.CreateOrder();
            }
            else
            {
                var userId = await _truv.CreateUser();
                return await _truv.CreateUserBridgeToken(userId);
            }
        }
    }
}
