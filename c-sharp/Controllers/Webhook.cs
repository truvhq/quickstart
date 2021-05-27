using System.Threading.Tasks;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Security.Cryptography;
using System;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("webhook")]
  public class WebhookController : ControllerBase
  {

    [HttpPost]
    public async Task<string> Post()
    {
      using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
      {
        string body = await reader.ReadToEndAsync();
        return generateWebhookSign(body, Environment.GetEnvironmentVariable("API_SECRET"));
      }
    }

    private string generateWebhookSign(string body, string key)
    {
      using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key)))
      {
        // Compute the hash of the input file.
        byte[] hashValue = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
        
        return "v1=" + BitConverter.ToString(hashValue).Replace("-", "").ToLower();
        
      }
    }
  }
}
