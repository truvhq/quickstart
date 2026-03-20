SHELL := /bin/bash

.PHONY: env install application follow-up employee-portal upload-documents choice-connect

env:
	test -f .env || cp .env.example .env

install:
	npm install

# Demos
application: install
	node demos/application/server.js

follow-up: install
	node demos/follow-up/server.js

employee-portal: install
	node demos/employee-portal/server.js

upload-documents: install
	node demos/upload-documents/server.js

choice-connect: install
	node demos/choice-connect/server.js

# Quickstart language examples (in quickstarts/ folder)
node_local:
	cd quickstarts/node && \
	npm install && \
	set -a && source ../../.env && set +a && \
	npm start

python_local:
	python3 -m venv ./quickstarts/python/.venv && \
	./quickstarts/python/.venv/bin/pip3 install -r quickstarts/python/requirements.txt && \
	FLASK_DEBUG=true ./quickstarts/python/.venv/bin/python3 -m quickstarts.python.src.server

ruby_local:
	cd quickstarts/ruby && \
	bundle install && \
	set -a && source ../../.env && set +a && \
	./bin/rails server

csharp_local:
	cd quickstarts/c-sharp && \
	set -a && source ../../.env && set +a && \
	dotnet watch run

golang_local:
	cd quickstarts/golang && \
	go get && \
	set -a && source ../../.env && set +a && \
	go install && \
	go run truv
