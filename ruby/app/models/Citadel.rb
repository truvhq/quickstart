require 'net/http'
require 'json'

class Citadel
  class_attribute :api_url
  class_attribute :client_id
  class_attribute :client_secret

  def self.getBridgeToken()
    return sendRequest('bridge-tokens/', nil)
  end

  def self.getAccessToken(public_token)
    body = { "public_tokens" => [public_token] }.to_json
    return sendRequest('access-tokens/', body)["access_tokens"][0]
  end

  def self.getEmploymentInfoByToken(access_token)
    body = { "access_token" => access_token }.to_json
    sendRequest('verifications/employments/', body)
  end

  def self.getIncomeInfoByToken(access_token)
    body = { "access_token" => access_token }.to_json
    sendRequest('verifications/incomes/', body)
  end

  def self.sendRequest(endpoint, body)
    uri = URI("#{Citadel.api_url}#{endpoint}")
    req = Net::HTTP::Post.new uri
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