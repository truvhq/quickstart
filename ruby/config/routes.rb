Rails.application.routes.draw do
  root :to => 'main#index'
  get 'getVerifications/:public_token', to: 'verification#get'
  get 'getAdminData/:public_token', to: 'admin#get'
  get 'getBridgeToken', to: 'bridge_token#get'
  get 'startFasFlow/:public_token', to: 'fas#startFasFlow'
  get 'completeFasFlow/:first_micro/:second_micro', to: 'fas#completeFasFlow', constraints: { first_micro: /[^\/]+/, second_micro: /[^\/]+/ }
end
