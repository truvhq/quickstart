class BridgeToken
  def self.get
    product_type = ENV['API_PRODUCT_TYPE']
    order_products = ['income', 'employment']
    if Truv.is_order && order_products.include?(product_type)
      return Truv.createOrder()
    else
      user_id = Truv.createUser()
      return Truv.createUserBridgeToken(user_id)
    end
  end
end