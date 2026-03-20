class Admin
  def self.get(public_token)
    access_token = Truv.getAccessToken(public_token)["access_token"]
    directory = Truv.getEmployeeDirectoryByToken(access_token)
    # A start and end date are needed for a payroll report. The dates hard coded below will return a proper report from the sandbox environment
    report_id = Truv.requestPayrollReport(access_token, '2020-01-01', '2020-02-01')['payroll_report_id']
    payroll = Truv.getPayrollById(report_id)

    if payroll["status"] != "done"
      puts "TRUV: Report not complete. Waiting and trying again"
      sleep(2.seconds)
      payroll = Truv.getPayrollById(report_id)
    end

    return { "directory" => directory, "payroll" => payroll } 
  end
end