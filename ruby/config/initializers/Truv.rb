Rails.configuration.to_prepare do
  Truv.client_id = ENV.fetch('API_CLIENT_ID')
  Truv.client_secret = ENV.fetch('API_SECRET')
  Truv.product_type = ENV.fetch('API_PRODUCT_TYPE')
end