SHELL := /bin/bash

.PHONY: env python_docker python_local

env:
	test -f .env || cp .env.example .env

python_docker:
	docker-compose --file docker-compose.yml up --build python

node_docker:
	docker-compose --file docker-compose.yml up --build node

ruby_docker:
	docker-compose --file docker-compose.yml up --build ruby

csharp_docker:
	docker-compose --file docker-compose.yml up --build csharp

node_local:
	cd node && \
	npm install && \
	set -a && source ../.env && set +a && \
	npm start

python_local:
	python3 -m venv quickstart_venv && \
 		./quickstart_venv/bin/pip3 install -r python/requirements.txt && \
 		set -a && source .env && set +a && ./quickstart_venv/bin/python3 -m python.src.server

ruby_local:
	cd ruby && \
	bundle install && \
	set -a && source ../.env && set +a && \
	rails server

csharp_local:
	cd c-sharp && \
	set -a && source ../.env && set +a && \
	dotnet run

go_local:
	cd golang && \
	go get && \
	set -a && source ../.env && set +a && \
	go install && \
	go run citadel