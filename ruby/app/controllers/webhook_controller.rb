class WebhookController < ApplicationController
  def post
    @message = Webhook.post(request.raw_post, request.headers["X-WEBHOOK-SIGN"])
  end
end