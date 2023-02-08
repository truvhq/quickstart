require 'net/http'
require 'json'
require 'securerandom'

class Truv
  class_attribute :client_id
  class_attribute :client_secret
  class_attribute :product_type
  class_attribute :access_token

  def self.createUser()
    puts "TRUV: Requesting new user from https://prod.truv.com/v1/users/"
    uuid = SecureRandom.uuid
    bodyObj = { "external_user_id" => "qs-#{uuid}", "first_name" => "John", "last_name" => "Johnson", "email" => "j.johnson@example.com" }
    body = bodyObj.to_json
    return sendRequest('users/', body, "POST")["id"]
  end

  def self.createUserBridgeToken(user_id)
    puts "TRUV: Requesting user bridge token from https://prod.truv.com/v1/users/{user_id}/tokens/"
    puts "TRUV: User ID - #{user_id}"
    bodyObj = { "product_type" => Truv.product_type, "tracking_info" => "1338-0111-A" }

    if product_type == "pll" or product_type == "deposit_switch"
      bodyObj["account"] = { "account_number" => "10062800", "account_type" => "checking", "routing_number" => "123456789", "bank_name" => "TD Bank" }

      if product_type == "pll"
        bodyObj["account"]["deposit_type"] = "amount"
        bodyObj["account"]["deposit_value"] = "100"
      end
    end
    body = bodyObj.to_json
    return sendRequest("users/#{user_id}/tokens/", body, "POST")
  end

  def self.getAccessToken(public_token)
    # https://docs.truv.com/?ruby#exchange-token-flow
    puts "TRUV: Exchanging a public_token for an access_token from https://prod.truv.com/v1/link-access-tokens/"
    puts "TRUV: Public Token - #{public_token}"
    body = { "public_token" => public_token }.to_json
    Truv.access_token = sendRequest('link-access-tokens/', body, "POST")["access_token"]
    return Truv.access_token
  end

  def self.getEmploymentInfoByToken(access_token)
    # https://docs.truv.com/?ruby#employment-verification
    if access_token == nil 
      access_token = Truv.access_token
    end
    puts "TRUV: Requesting employment verification data using an access_token from https://prod.truv.com/v1/links/reports/employment/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest('links/reports/employment/', body, "POST")
  end

  def self.getIncomeInfoByToken(access_token)
    # https://docs.truv.com/?ruby#income-verification
    if access_token == nil 
      access_token = Truv.access_token
    end
    puts "TRUV: Requesting income verification data using an access_token from https://prod.truv.com/v1/links/reports/income/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest('links/reports/income/', body, "POST")
  end

  def self.createRefreshTask()
    # https://docs.truv.com/?ruby#data-refresh
    puts "TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks/"
    puts "TRUV: Access Token - #{Truv.access_token}"
    body = { "access_token" => Truv.access_token }.to_json
    sendRequest('refresh/tasks/', body, "POST")["task_id"]
  end

  def self.getRefreshTask(task_id)
    # https://docs.truv.com/?ruby#data-refresh
    puts "TRUV: Requesting a refresh task using a task_id from https://prod.truv.com/v1/refresh/tasks/{task_id}/"
    puts "TRUV: Task ID - #{task_id}"
    sendRequest("refresh/tasks/#{task_id}/", nil, "GET")
  end

  def self.getEmployeeDirectoryByToken(access_token)
    if access_token == nil 
      access_token = Truv.access_token
    end
    puts "TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/links/reports/admin/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest("links/reports/admin/", body, "POST")
  end

  def self.requestPayrollReport(access_token, start_date, end_date)
    if access_token == nil 
      access_token = Truv.access_token
    end
    puts "TRUV: Requesting a payroll report be created using an access_token from https://prod.truv.com/v1/administrators/payrolls/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token, "start_date" => start_date, "end_date" => end_date }.to_json
    sendRequest("administrators/payrolls/", body, "POST")
  end

  def self.getPayrollById(report_id)
    puts "TRUV: Requesting a payroll report using a report_id from https://prod.truv.com/v1/administrators/payrolls/{report_id}/"
    puts "TRUV: Report ID - #{report_id}"
    sendRequest("administrators/payrolls/#{report_id}/", nil, "GET")
  end

  def self.getDepositSwitchByToken(access_token)
    # https://docs.truv.com/?ruby#direct-deposit
    puts "TRUV: Requesting direct deposit switch data using an access_token from https://prod.truv.com/v1/links/reports/direct_deposit/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest('links/reports/direct_deposit/', body, "POST")
  end

  def self.getPaycheckLinkedLoanByToken(access_token)
    puts "TRUV: Requesting pll data using an access_token from https://prod.truv.com/v1/links/reports/pll/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest('links/reports/pll/', body, "POST")
  end

  def self.sendRequest(endpoint, body, method)
    uri = URI("https://prod.truv.com/v1/#{endpoint}")
    if method == "POST"
      req = Net::HTTP::Post.new uri
    else
      req = Net::HTTP::Get.new uri
    end
    req['Content-Type'] = 'application/json'
    req['Accept'] = 'application/json'
    req['X-Access-Client-Id'] = Truv.client_id
    req['X-Access-Secret'] = Truv.client_secret
    if body
      req.body = body
    end

    response = Net::HTTP.start(uri.hostname, uri.port, :use_ssl => uri.scheme == 'https') do |http|
      http.request req
    end

    case response
    when Net::HTTPSuccess then
      body = JSON.parse(response.body)
      return body
    else
      puts "ERROR REACHING TRUV".inspect
      puts response.inspect
      return JSON.parse('{}')
    end
  end
end