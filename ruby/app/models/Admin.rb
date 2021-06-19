class Admin
  class_attribute :product_type

  def self.get(public_token)
    access_token = Citadel.getAccessToken(public_token)
    if Admin.product_type == "admin-directory"
      return Citadel.getEmployeeDirectoryByToken(access_token)
    end
    report_id = Citadel.requestPayrollReport(access_token, '2020-01-01', '2020-02-01')['payroll_report_id']
    return Citadel.getPayrollById(report_id)
  end
end