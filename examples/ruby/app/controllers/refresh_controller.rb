class RefreshController < ApplicationController
  def get
    @message = Refresh.get()
  end
end