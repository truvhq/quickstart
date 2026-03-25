Rails.configuration.to_prepare do
  %w[
    API_CLIENT_ID
    API_SECRET
    API_PRODUCT_TYPE
  ].each do |env_var|
    if !ENV.has_key?(env_var) || ENV[env_var].blank?
      raise <<~EOL
      Please provide #{env_var}
      EOL
    end
  end

  Truv.client_id = ENV.fetch('API_CLIENT_ID')
  Truv.client_secret = ENV.fetch('API_SECRET')
  Truv.product_type = ENV.fetch('API_PRODUCT_TYPE')
  is_order_env = ENV.fetch('IS_ORDER', '').strip
  Truv.is_order = is_order_env.empty? || is_order_env.downcase == 'true'
end