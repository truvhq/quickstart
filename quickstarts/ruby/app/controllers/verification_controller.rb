class VerificationController < ApplicationController
  def get
    @message = Verification.get(params[:public_token])
  end
end