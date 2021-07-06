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
    end
  end
end