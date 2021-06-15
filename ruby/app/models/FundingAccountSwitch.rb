class FundingAccountSwitch
  def self.startFundingSwitchFlow(public_token)
    @accessToken = Citadel.getAccessToken(public_token)
    return Citadel.getFundingSwitchStatusByToken(@accessToken)
  end
  def self.completeFundingSwitchFlow(first_micro, second_micro)
    return Citadel.completeFundingSwitchFlowByToken(@accessToken, first_micro, second_micro)
  end
end