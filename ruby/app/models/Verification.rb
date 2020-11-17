class Verification
  def self.get(public_token)
    access_token = Citadel.getAccessToken(public_token)
    if ENV.fetch("API_PRODUCT_TYPE") == "employment"
      return Citadel.getEmploymentInfoByToken(access_token)
    else
      return Citadel.getIncomeInfoByToken(access_token)
    end
  end
end