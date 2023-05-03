using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
    [ApiController]
    [Route("getPaycheckLinkedLoanData")]
    public class PaycheckLinkedLoanController : ControllerBase
    {
        private Truv _truv = new Truv();

        [Route("{token}")]
        [HttpGet]
        public async Task<string> Get(string token)
        {
            AccessTokenResponse linkToken = await _truv.GetLinkToken(token);
            return await _truv.GetLinkReport(linkToken.LinkId, "pll");
        }
    }
}

