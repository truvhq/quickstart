require 'net/http'
require 'json'

class Citadel
  class_attribute :api_url
  class_attribute :client_id
  class_attribute :client_secret

  def self.getBridgeToken()
    return sendRequest('bridge-tokens/', nil, "POST")
  end

  def self.getAccessToken(public_token)
    body = { "public_tokens" => [public_token] }.to_json
    return sendRequest('access-tokens/', body, "POST")["access_tokens"][0]
  end

  def self.getEmploymentInfoByToken(access_token)
    body = { "access_token" => access_token }.to_json
    sendRequest('verifications/employments/', body, "POST")
  end

  def self.getIncomeInfoByToken(access_token)
    body = { "access_token" => access_token }.to_json
    sendRequest('verifications/incomes/', body, "POST")
  end

  def self.getEmployeeDirectoryByToken(access_token)
    body = { "access_token" => access_token }.to_json
    sendRequest("administrators/directories/", body, "POST")
  end

  def self.getPayrollReport(access_token, start_date, end_date)
    body = { "access_token" => access_token, "start_date" => start_date, "end_date" => end_date }.to_json
    sendRequest("administrators/payrolls/", body, "POST")
  end

  def self.getPayrollById(report_id)
    sendRequest("administrators/payrolls/#{report_id}", nil, "GET")
  end

  def self.sendRequest(endpoint, body, method)
    uri = URI("#{Citadel.api_url}#{endpoint}")
    puts "accessing #{endpoint}".inspect
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