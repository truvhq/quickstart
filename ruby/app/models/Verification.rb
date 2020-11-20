class Verification
  class_attribute :product_type

  def self.get(public_token)
    access_token = Citadel.getAccessToken(public_token)
    if Verification.product_type == "employment"
      return Citadel.getEmploymentInfoByToken(access_token)
    else
      return Citadel.getIncomeInfoByToken(access_token)
    end
  end
end