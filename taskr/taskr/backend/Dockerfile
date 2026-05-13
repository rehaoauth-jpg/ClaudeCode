FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server.js"]
