using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
    [ApiController]
    [Route("")]
    public class RootController : ControllerBase
    {

        private readonly ILogger<RootController> _logger;

        public RootController(ILogger<RootController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public ContentResult Get()
        {
            var productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");
            var fileContent = System.IO.File.ReadAllText($"../html/{productType}.html");
            fileContent = fileContent.Replace("{{ server_url }}", $"http://{Request.Host.Value}/");
            return base.Content(fileContent, "text/html");
        }
    }
}
