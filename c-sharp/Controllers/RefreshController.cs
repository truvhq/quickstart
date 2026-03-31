using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
    [ApiController]
    [Route("createRefreshTask")]
    public class RefreshController : ControllerBase
    {

        private Truv _truv = new Truv();
        private string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

        [HttpGet]
        public async Task<string> Get()
        {
            var createTaskResponse = await _truv.CreateRefreshTask();
            var parsedResponse = JsonDocument.Parse(createTaskResponse);
            var taskId = parsedResponse.RootElement.GetProperty("task_id").GetString();

            var refreshTaskResponse = await _truv.GetRefreshTask(taskId);
            var parsedTaskResponse = JsonDocument.Parse(refreshTaskResponse);
            var status = parsedTaskResponse.RootElement.GetProperty("status").GetString();

            string[] finishedStatuses = { "done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error" };

            while (Array.IndexOf(finishedStatuses, status) < 0)
            {
                Console.WriteLine("TRUV: Refresh task is not finished. Waiting 2 seconds, then checking again.");
                Thread.Sleep(2000);
                refreshTaskResponse = await _truv.GetRefreshTask(taskId);
                parsedTaskResponse = JsonDocument.Parse(refreshTaskResponse);
                status = parsedTaskResponse.RootElement.GetProperty("status").GetString();
            }

            Console.WriteLine("TRUV: Refresh task is finished. Pulling the latest data.");
            switch (_productType)
            {
                case "employment":
                    return await _truv.GetLinkReport(null, _productType);

                case "income":
                    return await _truv.GetLinkReport(null, _productType);

                default:
                    return "{ \"success\": false }";
            }


        }
    }
}
