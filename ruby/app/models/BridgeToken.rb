class BridgeToken
  def self.get
    user_id = Truv.createUser()
    return Truv.createUserBridgeToken(user_id)
  end
end