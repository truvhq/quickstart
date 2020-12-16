Rails.configuration.to_prepare do
  MainController.product_type = ENV.fetch('API_PRODUCT_TYPE')
end