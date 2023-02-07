FROM node:14.21.2

WORKDIR /app
ADD . .
WORKDIR /app/node

RUN npm install

EXPOSE 5004
CMD ["npm", "start"]
