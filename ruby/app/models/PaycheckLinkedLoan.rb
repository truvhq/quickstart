class PaycheckLinkedLoan
  def self.get(public_token)
    link_id = Truv.getAccessToken(public_token)["link_id"]
    return Truv.getLinkReport(link_id, "pll")
  end
end