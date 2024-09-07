FROM golang:1.22.7

COPY html /html

WORKDIR /app

COPY golang .

EXPOSE 5003
CMD ["go", "run", "truv"]
