Rails.configuration.to_prepare do
  Admin.product_type = ENV.fetch('API_PRODUCT_TYPE')
end