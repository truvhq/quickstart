.PHONY: env python_docker python_venv

env:
	test -f .env || cp .env.example .env

python_docker:
	docker-compose --file python/docker-compose.yml up --build


python_venv:
	python -m venv quickstart_venv && \
 		./quickstart_venv/bin/pip install -r python/requirements.txt && \
 		set -a && source .env && set +a && ./quickstart_venv/bin/python -m python.src.server


