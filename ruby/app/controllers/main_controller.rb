class MainController < ApplicationController
  class_attribute :product_type

  def index
    product_type = MainController.product_type
    if product_type == "deposit_switch"
      product_type = "dds"
    end
    fileContent = File.read("../html/#{product_type}.html")
    fileContent.sub! '{{ product_type }}', product_type
    fileContent.sub! '{{ server_url }}', "http://#{request.host_with_port}/"
    render :inline => fileContent
  end
end