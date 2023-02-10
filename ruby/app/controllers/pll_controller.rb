class PllController < ApplicationController
  def get
    @message = PaycheckLinkedLoan.get(params[:public_token])
  end
end