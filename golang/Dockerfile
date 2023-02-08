FROM golang:1.20

COPY html /html

WORKDIR /app

COPY golang .

EXPOSE 5003
CMD ["go", "run", "truv"]
