class Verification
  class_attribute :product_type

  def self.get(public_token)
    link_id = Truv.getAccessToken(public_token)["link_id"]
    return Truv.getLinkReport(link_id, Verification.product_type)
  end
end