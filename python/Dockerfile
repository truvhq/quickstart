FROM python:3.10-slim

COPY html /html

WORKDIR /app

COPY python .
RUN pip3 install -r requirements.txt

ENV FLASK_APP=src.server:app
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_DEBUG=true
ENV FLASK_RUN_PORT=5001

EXPOSE 5001

CMD ["flask", "run"]
