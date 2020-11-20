Rails.configuration.to_prepare do
  MainController.product_type = ENV.fetch('API_PRODUCT_TYPE')
  MainController.public_key = ENV.fetch('API_PUBLIC_KEY')
end