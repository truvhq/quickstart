class DirectDepositSwitch
  def self.get(public_token)
    access_token = Truv.getAccessToken(public_token)
    return Truv.getDepositSwitchByToken(access_token)
  end
end