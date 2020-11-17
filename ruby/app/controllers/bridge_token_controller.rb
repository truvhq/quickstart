class BridgeTokenController < ApplicationController
  def get
    @message = BridgeToken.new.get
  end
end