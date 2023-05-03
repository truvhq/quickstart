class Refresh
  class_attribute :product_type

  def self.get()
    task_id = Truv.createRefreshTask(Refresh.product_type)
    
    refreshStatus = Truv.getRefreshTask(task_id)

    finishedStatuses = ["done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"]

    while (not finishedStatuses.include? refreshStatus["status"]) == true
      puts "TRUV: Refresh task is not finished. Waiting 2 seconds, then checking again."
      sleep(2.seconds)
      refreshStatus = Truv.getRefreshTask(task_id)
    end

    puts "TRUV: Refresh task is finished. Pulling the latest data."

    if Refresh.product_type == "employment" or Refresh.product_type == "income"
      return Truv.getLinkReport(nil, Refresh.product_type)
    elsif Refresh.product_type == "admin"
      directory = Truv.getEmployeeDirectoryByToken(nil)
      # A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
      report_id = Truv.requestPayrollReport(nil, '2020-01-01', '2020-02-01')['payroll_report_id']
      payroll = Truv.getPayrollById(report_id)
      return { "directory" => directory, "payroll" => payroll } 
    end
  end
end