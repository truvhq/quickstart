class DirectDepositSwitch
  def self.get(public_token)
    access_token = Citadel.getAccessToken(public_token)
    return Citadel.getDepositSwitchByToken(access_token)
  end
end