Rails.application.routes.draw do
  root :to => 'main#index'
  get 'getVerifications/:public_token', to: 'verification#get'
  get 'getAdminData/:public_token', to: 'admin#get'
  get 'getBridgeToken', to: 'bridge_token#get'
  get 'startFundingSwitchFlow/:public_token', to: 'funding_switch#startFundingSwitchFlow'
  get 'completeFundingSwitchFlow/:first_micro/:second_micro', to: 'funding_switch#completeFundingSwitchFlow', constraints: { first_micro: /[^\/]+/, second_micro: /[^\/]+/ }
  get 'getDepositSwitchData/:public_token', to: 'deposit_switch#get'
  post 'webhook', to: 'webhook#post'
end
