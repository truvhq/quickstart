require 'net/http'
require 'json'

class Citadel
  class_attribute :client_id
  class_attribute :client_secret
  class_attribute :product_type

  def self.getBridgeToken()
    # https://docs.citadelid.com/ruby#bridge-tokens_create
    puts "CITADEL: Requesting bridge token from https://prod.citadelid.com/v1/bridge-tokens"
    body = { "product_type" => Citadel.product_type, "client_name" => "Citadel Quickstart", "tracking_info" => "1337" }.to_json
    return sendRequest('bridge-tokens/', body, "POST")
  end

  def self.getAccessToken(public_token)
    # https://docs.citadelid.com/?ruby#exchange-token-flow
    puts "CITADEL: Exchanging a public_token for an access_token from https://prod.citadelid.com/v1/link-access-tokens"
    puts "CITADEL: Public Token - #{public_token}"
    body = { "public_token" => public_token }.to_json
    return sendRequest('link-access-tokens/', body, "POST")["access_token"]
  end

  def self.getEmploymentInfoByToken(access_token)
    # https://docs.citadelid.com/?ruby#employment-verification
    puts "CITADEL: Requesting employment verification data using an access_token from https://prod.citadelid.com/v1/verifications/employments"
    puts "CITADEL: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest('verifications/employments/', body, "POST")
  end

  def self.getIncomeInfoByToken(access_token)
    # https://docs.citadelid.com/?ruby#income-verification
    puts "CITADEL: Requesting income verification data using an access_token from https://prod.citadelid.com/v1/verifications/incomes"
    puts "CITADEL: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest('verifications/incomes/', body, "POST")
  end

  def self.getEmployeeDirectoryByToken(access_token)
    # * https://docs.citadelid.com/?ruby#employee-directory
    puts "CITADEL: Requesting employee directory data using an access_token from https://prod.citadelid.com/v1/administrators/directories"
    puts "CITADEL: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest("administrators/directories/", body, "POST")
  end

  def self.requestPayrollReport(access_token, start_date, end_date)
    # https://docs.citadelid.com/?ruby#create-payroll-report
    puts "CITADEL: Requesting a payroll report be created using an access_token from https://prod.citadelid.com/v1/administrators/payrolls"
    puts "CITADEL: Access Token - #{access_token}"
    body = { "access_token" => access_token, "start_date" => start_date, "end_date" => end_date }.to_json
    sendRequest("administrators/payrolls/", body, "POST")
  end

  def self.getPayrollById(report_id)
    # https://docs.citadelid.com/?ruby#retrieve-payroll-report
    puts "CITADEL: Requesting a payroll report using a report_id from https://prod.citadelid.com/v1/administrators/payrolls/{report_id}"
    puts "CITADEL: Report ID - #{report_id}"
    sendRequest("administrators/payrolls/#{report_id}", nil, "GET")
  end

  def self.sendRequest(endpoint, body, method)
    uri = URI("https://prod.citadelid.com/v1/#{endpoint}")
    if method == "POST"
      req = Net::HTTP::Post.new uri
    else
      req = Net::HTTP::Get.new uri
    end
    req['Content-Type'] = 'application/json'
    req['Accept'] = 'application/json'
    req['X-Access-Client-Id'] = Citadel.client_id
    req['X-Access-Secret'] = Citadel.client_secret
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
      puts "ERROR REACHING CITADEL".inspect
      puts response.inspect
      return JSON.parse('{}')
    end
  end
end