FROM ruby:2.7.7

COPY html /html

WORKDIR /app

COPY ruby .

RUN apt-get update -qq && apt-get install -y nodejs postgresql-client
RUN gem install bundler -v 2.4.22 && bundle install

# Add a script to be executed every time the container starts.
COPY ./ruby/entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
EXPOSE 5002

# Start the main process.
CMD ["rails", "server", "-b", "0.0.0.0", "-p", "5002"]