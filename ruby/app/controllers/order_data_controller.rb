class OrderDataController < ApplicationController
  def get
    @message = OrderData.get(params[:order_id])
  end
end
