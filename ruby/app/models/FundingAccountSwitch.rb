class FundingAccountSwitch
  def self.startFundingSwitchFlow(public_token)
    @accessToken = Truv.getAccessToken(public_token)
    return Truv.getFundingSwitchStatusByToken(@accessToken)
  end
  def self.completeFundingSwitchFlow(first_micro, second_micro)
    return Truv.completeFundingSwitchFlowByToken(@accessToken, first_micro, second_micro)
  end
end