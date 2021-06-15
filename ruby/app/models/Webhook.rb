require 'json'

class Webhook
  def self.generate_webhook_sign(body, key)
    digest = OpenSSL::Digest.new('sha256')
    return "v1=" + OpenSSL::HMAC.hexdigest(digest, key, body)
  end
  
  def self.post(body, headerSignature)
    signature = self.generate_webhook_sign(body, Citadel.client_secret)
    jsonParse = JSON.parse(body)
    puts "CITADEL: Webhook received"
    puts "CITADEL: Event type: #{jsonParse['event_type']}"
    puts "CITADEL: Status:     #{jsonParse['status']}"
    puts "CITADEL: Signature match: #{signature == headerSignature}\n"
    return ""
  end
end