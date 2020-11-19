Rails.configuration.to_prepare do
  Citadel.api_url = ENV.fetch('API_URL')
  Citadel.client_id = ENV.fetch('API_CLIENT_ID')
  Citadel.client_secret = ENV.fetch('API_SECRET')
end