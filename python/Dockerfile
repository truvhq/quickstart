FROM python:3.10.9

WORKDIR /app
ADD . .
WORKDIR /app/python

RUN pip3 install -r requirements.txt

WORKDIR /app

ENV FLASK_APP=python.src.server.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV='development'
ENV FLASK_DEBUG=true
ENV FLASK_RUN_PORT=5001
EXPOSE 5001
CMD ["flask", "run"]
