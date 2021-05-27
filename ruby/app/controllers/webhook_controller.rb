class WebhookController < ApplicationController
  def post
    @message = Webhook.post(request.raw_post)
  end
end