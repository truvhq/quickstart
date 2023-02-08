class PaycheckLinkedLoan
  def self.get(public_token)
    access_token = Truv.getAccessToken(public_token)
    return Truv.getPaycheckLinkedLoanByToken(access_token)
  end
end