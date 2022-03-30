class Verification
  class_attribute :product_type

  def self.get(public_token)
    access_token = Truv.getAccessToken(public_token)
    if Verification.product_type == "employment"
      return Truv.getEmploymentInfoByToken(access_token)
    else
      return Truv.getIncomeInfoByToken(access_token)
    end
  end
end