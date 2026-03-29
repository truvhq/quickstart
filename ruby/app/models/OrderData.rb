class OrderData
  def self.get(order_id)
    return Truv.getOrder(order_id)
  end
end
