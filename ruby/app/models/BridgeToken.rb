class BridgeToken
  def self.get
    if Truv.is_order
      return Truv.createOrder()
    else
      user_id = Truv.createUser()
      return Truv.createUserBridgeToken(user_id)
    end
  end
end