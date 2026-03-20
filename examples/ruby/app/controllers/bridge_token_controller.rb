class BridgeTokenController < ApplicationController
  def get
    @message = BridgeToken.get()
  end
end