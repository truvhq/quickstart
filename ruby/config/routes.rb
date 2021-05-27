Rails.application.routes.draw do
  root :to => 'main#index'
  get 'getVerifications/:public_token', to: 'verification#get'
  get 'getAdminData/:public_token', to: 'admin#get'
  get 'getBridgeToken', to: 'bridge_token#get'
  post 'webhook', to: 'webhook#post'
end
