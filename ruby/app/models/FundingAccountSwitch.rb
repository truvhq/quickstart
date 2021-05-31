class FundingAccountSwitch
  def self.startFasFlow(public_token)
    @accessToken = Citadel.getAccessToken(public_token)
    return Citadel.getFasStatusByToken(@accessToken)
  end
  def self.completeFasFlow(first_micro, second_micro)
    return Citadel.completeFasFlowByToken(@accessToken, first_micro, second_micro)
  end
end