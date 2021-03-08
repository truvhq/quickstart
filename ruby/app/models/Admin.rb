class Admin
  def self.get(public_token)
    access_token = Citadel.getAccessToken(public_token)
    directory = Citadel.getEmployeeDirectoryByToken(access_token)
    report_id = Citadel.requestPayrollReport(access_token, '2020-01-01', '2020-02-01')['payroll_report_id']
    payroll = Citadel.getPayrollById(report_id)
    return { "directory" => directory, "payroll" => payroll } 
  end
end