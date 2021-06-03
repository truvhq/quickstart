class FasController < ApplicationController
  def startFasFlow
    @message = FundingAccountSwitch.startFasFlow(params[:public_token])
  end

  def completeFasFlow
    @message = FundingAccountSwitch.completeFasFlow(params[:first_micro], params[:second_micro])
  end
end