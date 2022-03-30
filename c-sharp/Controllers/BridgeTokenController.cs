using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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
      return await _truv.GetBridgeToken();
    }
  }
}
