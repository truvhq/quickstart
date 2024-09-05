FROM golang:1.22.6

COPY html /html

WORKDIR /app

COPY golang .

EXPOSE 5003
CMD ["go", "run", "truv"]
