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
    end
  end
end