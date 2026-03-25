require 'json'

class Webhook
  def self.generate_webhook_sign(body, key)
    digest = OpenSSL::Digest.new('sha256')
    return "v1=" + OpenSSL::HMAC.hexdigest(digest, key, body)
  end
  
  def self.post(body, headerSignature)
    signature = self.generate_webhook_sign(body, Truv.client_secret)
    jsonParse = JSON.parse(body)
    puts "TRUV: Webhook received"
    puts "TRUV: Signature match: #{signature == headerSignature}"
    puts "TRUV: Event type: #{jsonParse['event_type']}"
    if jsonParse['status'].nil?
      puts "TRUV: No status, skipping\n"
      return ""
    end
    puts "TRUV: Status:     #{jsonParse['status']}\n"
    return ""
  end
end