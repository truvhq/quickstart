class DdsController < ApplicationController
  def get
    @message = DirectDepositSwitch.get(params[:public_token])
  end
end