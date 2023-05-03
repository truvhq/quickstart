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
            AccessTokenResponse linkToken = await _truv.GetLinkToken(token);
            return await _truv.GetLinkReport(linkToken.LinkId, _productType);
        }
    }
}
