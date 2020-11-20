Rails.application.routes.draw do
  root :to => 'main#index'
  get 'getVerifications/:public_token', to: 'verification#get'
  get 'getBridgeToken', to: 'bridge_token#get'
end
