FROM golang:latest

COPY html /html

WORKDIR /app

COPY golang .

EXPOSE 5003
CMD ["go", "run", "truv"]
