class Refresh
  class_attribute :product_type

  def self.get()
    task_id = Citadel.createRefreshTask()
    
    refreshStatus = Citadel.getRefreshTask(task_id)

    finishedStatuses = ["done", "login_error", "mfa_error", "config_error", "account_locked", "no_data", "unavailable", "error"]

    while (not finishedStatuses.include? refreshStatus["status"]) == true
      puts "CITADEL: Refresh task is not finished. Waiting 2 seconds, then checking again."
      sleep(2.seconds)
      refreshStatus = Citadel.getRefreshTask(task_id)
    end

    puts "CITADEL: Refresh task is finished. Pulling the latest data."

    if Refresh.product_type == "employment"
      return Citadel.getEmploymentInfoByToken(nil)
    elsif Refresh.product_type == "income"
      return Citadel.getIncomeInfoByToken(nil)
    elsif Refresh.product_type == "admin"
      directory = Citadel.getEmployeeDirectoryByToken(nil)
      report_id = Citadel.requestPayrollReport(nil, '2020-01-01', '2020-02-01')['payroll_report_id']
      payroll = Citadel.getPayrollById(report_id)
      return { "directory" => directory, "payroll" => payroll } 
    end
  end
end