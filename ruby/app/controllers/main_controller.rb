class MainController < ApplicationController
  def index
    product_type = ENV.fetch('API_PRODUCT_TYPE')
    public_key = ENV.fetch('API_PUBLIC_KEY')
    fileContent = File.read("../html/#{product_type}.html")
    fileContent.sub! '{{ product_type }}', product_type
    fileContent.sub! '{{ public_key }}', public_key
    render :inline => fileContent
  end
end