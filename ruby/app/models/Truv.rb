require 'net/http'
require 'json'
require 'securerandom'

class Truv
  class_attribute :client_id
  class_attribute :client_secret
  class_attribute :product_type
  class_attribute :link_token
  class_attribute :is_order

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

  def self.createOrder()
    puts "TRUV: Requesting an order from https://prod.truv.com/v1/orders/"
    uuid = SecureRandom.uuid
    bodyObj = {
      "order_number" => "qs-#{uuid}",
      "first_name" => "John",
      "last_name" => "Johnson",
      "email" => "j.johnson@example.com",
      "products" => [Truv.product_type]
    }

    if ["deposit_switch", "pll", "employment"].include?(product_type)
      bodyObj["employers"] = [
        {
          "company_name" => "Home Depot"
        }
      ]
    end

    if ["deposit_switch", "pll"].include?(product_type)
      bodyObj["employers"][0]["account"] = {
        "account_number" => "16002600",
        "account_type" => "checking",
        "routing_number" => "12345678",
        "bank_name" => "Truv Bank"
      }

      if product_type == "pll"
        bodyObj["employers"][0]["account"]["deposit_type"] = "amount"
        bodyObj["employers"][0]["account"]["deposit_value"] = "100"
      end
    end

    body = bodyObj.to_json
    return sendRequest("orders/", body, "POST")
  end

  def self.getAccessToken(public_token)
    body = { "public_token" => public_token }.to_json
    Truv.link_token = sendRequest('link-access-tokens/', body, "POST")
    return Truv.link_token
  end

  def self.getLinkReport(link_id, product_type)
    if link_id == nil
      link_id = Truv.link_token["link_id"]
    end
    puts "TRUV: Requesting #{product_type} report from https://prod.truv.com/v1/links/#{link_id}/#{product_type}/report"
    puts "TRUV: Link ID - #{link_id}"
    sendRequest("links/#{link_id}/#{product_type}/report", nil, "GET")
  end

  def self.createRefreshTask(product_type)
    # https://docs.truv.com/?ruby#data-refresh
    access_token = Truv.link_token["access_token"]
    puts "TRUV: Requesting a data refresh using an access_token from https://prod.truv.com/v1/refresh/tasks/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token, "product_type" => product_type }.to_json
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
      access_token = Truv.link_token["access_token"]
    end
    puts "TRUV: Requesting employee directory data using an access_token from https://prod.truv.com/v1/links/reports/admin/"
    puts "TRUV: Access Token - #{access_token}"
    body = { "access_token" => access_token }.to_json
    sendRequest("links/reports/admin/", body, "POST")
  end

  def self.requestPayrollReport(access_token, start_date, end_date)
    if access_token == nil 
      access_token = Truv.link_token["access_token"]
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