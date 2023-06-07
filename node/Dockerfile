FROM node:16

COPY html /html

WORKDIR /app

COPY node .
RUN npm install

EXPOSE 5004
CMD ["npm", "start"]
