FROM python:3.8
ADD requirements.txt requirements.txt
RUN pip3 install -r requirements.txt
ADD /src /app/src
WORKDIR /app/

ENV FLASK_APP=server.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_ENV='development'
ENV FLASK_DEBUG=true

ENV API_URL=""
ENV API_SECRET=""
ENV API_CLIENT_ID=""

EXPOSE 5000

CMD ["python", "-m", "src.server"]
