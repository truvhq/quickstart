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
  Truv.is_order = ENV.fetch('IS_ORDER', 'false').downcase == 'true'
end