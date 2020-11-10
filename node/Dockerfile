FROM node:14.15.0

WORKDIR /app
ADD . .
WORKDIR /app/node

RUN npm install

EXPOSE 5000
CMD ["npm", "start"]
