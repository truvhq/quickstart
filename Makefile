SHELL := /bin/bash

.PHONY: env install application follow-up employee-portal upload-documents choice-connect

env:
	test -f .env || cp .env.example .env

install:
	npm install

application: install
	node application/server.js

follow-up: install
	node follow-up/server.js

employee-portal: install
	node employee-portal/server.js

upload-documents: install
	node upload-documents/server.js

choice-connect: install
	node choice-connect/server.js

# Legacy language examples (in examples/ folder)
python_docker:
	docker-compose up --build python

python_local:
	python3 -m venv ./examples/python/.venv && \
	./examples/python/.venv/bin/pip3 install -r examples/python/requirements.txt && \
	FLASK_DEBUG=true ./examples/python/.venv/bin/python3 -m legacy.python.src.server

ruby_local:
	cd examples/ruby && \
	bundle install && \
	set -a && source ../../.env && set +a && \
	./bin/rails server

csharp_local:
	cd examples/c-sharp && \
	set -a && source ../../.env && set +a && \
	dotnet watch run

golang_local:
	cd examples/golang && \
	go get && \
	set -a && source ../../.env && set +a && \
	go install && \
	go run truv
