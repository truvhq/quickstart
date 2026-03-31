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
            var productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");
            var orderProducts = new[] { "income", "employment" };
            var isOrderFlag = string.IsNullOrWhiteSpace(isOrder) || isOrder.Trim().Equals("true", StringComparison.OrdinalIgnoreCase);

            if (isOrderFlag && orderProducts.Contains(productType))
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
