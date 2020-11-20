class MainController < ApplicationController
  class_attribute :product_type
  class_attribute :public_key

  def index
    product_type = MainController.product_type
    public_key = MainController.public_key
    fileContent = File.read("../html/#{product_type}.html")
    fileContent.sub! '{{ product_type }}', product_type
    fileContent.sub! '{{ public_key }}', public_key
    render :inline => fileContent
  end
end