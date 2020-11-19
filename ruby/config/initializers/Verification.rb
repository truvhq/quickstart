Rails.configuration.to_prepare do
  Verification.product_type = ENV.fetch('API_PRODUCT_TYPE')
end