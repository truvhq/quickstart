Rails.configuration.to_prepare do
  Refresh.product_type = ENV.fetch('API_PRODUCT_TYPE')
end