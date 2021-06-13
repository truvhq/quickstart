class FundingSwitchController < ApplicationController
  def startFundingSwitchFlow
    @message = FundingAccountSwitch.startFundingSwitchFlow(params[:public_token])
  end

  def completeFundingSwitchFlow
    @message = FundingAccountSwitch.completeFundingSwitchFlow(params[:first_micro], params[:second_micro])
  end
end