FROM ruby:2.7.5

WORKDIR /myapp
COPY . /myapp
WORKDIR /myapp/ruby

RUN apt-get update -qq && apt-get install -y nodejs postgresql-client
RUN bundle install

# Add a script to be executed every time the container starts.
COPY ./ruby/entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
EXPOSE 3000

# Start the main process.
CMD ["rails", "server", "-b", "0.0.0.0", "-p", "3000"]