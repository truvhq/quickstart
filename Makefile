SHELL := /bin/bash

.PHONY: env python_docker python_local

env:
	test -f .env || cp .env.example .env

python_docker:
	docker-compose up --build python

node_docker:
	docker-compose up --build node

ruby_docker:
	docker-compose up --build ruby

csharp_docker:
	docker-compose up --build csharp

golang_docker:
	docker-compose up --build golang

node_local:
	cd node && \
	npm install && \
	set -a && source ../.env && set +a && \
	npm start

python_local:
	python3 -m venv ./python/.venv && \
	./python/.venv/bin/pip3 install -r python/requirements.txt && \
	FLASK_DEBUG=true ./python/.venv/bin/python3 -m python.src.server

ruby_local:
	cd ruby && \
	bundle install && \
	set -a && source ../.env && set +a && \
	./bin/rails server

csharp_local:
	cd c-sharp && \
	set -a && source ../.env && set +a && \
	dotnet watch run

golang_local:
	cd golang && \
	go get && \
	set -a && source ../.env && set +a && \
	go install && \
	go run truv