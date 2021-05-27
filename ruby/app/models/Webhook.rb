class Webhook
  def self.generate_webhook_sign(body, key)
    digest = OpenSSL::Digest.new('sha256')
    return "v1=" + OpenSSL::HMAC.hexdigest(digest, key, body)
  end
  
  def self.post(body)
    return self.generate_webhook_sign(body, Citadel.client_secret)
  end
end