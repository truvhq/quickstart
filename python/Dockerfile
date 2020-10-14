FROM python:3.8
ADD requirements.txt requirements.txt
RUN pip3 install -r requirements.txt
ADD /src /app/src
WORKDIR /app/

ENV FLASK_APP=src.server.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV='development'
ENV FLASK_DEBUG=true
EXPOSE 5000
CMD ["flask", "run"]
