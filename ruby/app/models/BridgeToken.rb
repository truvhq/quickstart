require 'net/http'
require 'json'

class BridgeToken
  def get
    result = Citadel.sendRequest("bridge-tokens/")
    return result
  end
end