FROM golang:1.22.2

COPY html /html

WORKDIR /app

COPY golang .

EXPOSE 5003
CMD ["go", "run", "truv"]
