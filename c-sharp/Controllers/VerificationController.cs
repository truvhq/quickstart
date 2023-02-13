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
        private readonly string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

        [Route("{token}")]
        [HttpGet]
        public async Task<string> Get(string token)
        {
            var accessToken = await _truv.GetAccessToken(token);

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
