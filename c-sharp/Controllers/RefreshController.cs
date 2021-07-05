using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace c_sharp.Controllers
{
  [ApiController]
  [Route("createRefreshTask")]
  public class RefreshController : ControllerBase
  {

    private Citadel _citadel = new Citadel();
    private string _productType = Environment.GetEnvironmentVariable("API_PRODUCT_TYPE");

    [Route("")]
    [HttpGet]
    public async Task<string> Get()
    {
      var createTaskResponse = await _citadel.CreateRefreshTask();
      var parsedResponse = JsonDocument.Parse(createTaskResponse);
      var taskId = parsedResponse.RootElement.GetProperty("task_id").GetString();
      
      var refreshTaskResponse = await _citadel.GetRefreshTask(taskId);
      var parsedTaskResponse = JsonDocument.Parse(refreshTaskResponse);
      var status = parsedTaskResponse.RootElement.GetProperty("status").GetString();

      string[] finishedStatuses = {"done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"};

      while(Array.IndexOf(finishedStatuses, status) < 0) {
        Console.WriteLine("CITADEL: Refresh task is not finished. Waiting 2 seconds, then checking again.");
        Thread.Sleep(2000);
        refreshTaskResponse = await _citadel.GetRefreshTask(taskId);
        parsedTaskResponse = JsonDocument.Parse(refreshTaskResponse);
        status = parsedTaskResponse.RootElement.GetProperty("status").GetString();
      }

      Console.WriteLine("CITADEL: Refresh task is finished. Pulling the latest data.");
      switch (_productType) {
        case "employment":
          return await _citadel.GetEmploymentInfoByToken(null);
        default:
          return "{ \"success\": false }";
      }


    }
  }
}
