FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
ARG APP_VERSION=unknown
ENV APP_VERSION=$APP_VERSION
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server.js"]
