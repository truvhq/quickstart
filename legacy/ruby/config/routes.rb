Rails.application.routes.draw do
  root :to => 'main#index'
  get 'getVerifications/:public_token', to: 'verification#get'
  get 'getAdminData/:public_token', to: 'admin#get'
  get 'getBridgeToken', to: 'bridge_token#get'
  get 'getDepositSwitchData/:public_token', to: 'deposit_switch#get'
  get 'getPaycheckLinkedLoanData/:public_token', to: 'pll#get'
  get 'createRefreshTask', to: 'refresh#get'
  post 'webhook', to: 'webhook#post'
end
