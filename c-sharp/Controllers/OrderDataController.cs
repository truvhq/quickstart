using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
    [ApiController]
    [Route("getOrderData")]
    public class OrderDataController : ControllerBase
    {
        private Truv _truv = new Truv();

        [Route("{orderId}")]
        [HttpGet]
        public async Task<string> Get(string orderId)
        {
            return await _truv.GetOrder(orderId);
        }
    }
}
