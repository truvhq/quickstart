class AdminController < ApplicationController
  def get
    @message = Admin.get(params[:public_token])
  end
end