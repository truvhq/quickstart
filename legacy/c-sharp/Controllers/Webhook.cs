using System.Threading.Tasks;
using System.IO;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Security.Cryptography;
using System;
using System.Text.Json;

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
                var signature = generateWebhookSign(body, Environment.GetEnvironmentVariable("API_SECRET"));
                var document = JsonDocument.Parse(body);
                Console.WriteLine("TRUV: Webhook Received");
                Console.WriteLine("TRUV: Event type:      {0}", document.RootElement.GetProperty("event_type").GetString());
                Console.WriteLine("TRUV: Status:          {0}", document.RootElement.GetProperty("status").GetString());
                Console.WriteLine("TRUV: Signature match: {0}\n", Request.Headers["x-webhook-sign"].ToString() == signature);
                return String.Empty;
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
