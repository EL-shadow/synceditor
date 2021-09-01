FROM node:14-slim

ENV NODE_ENV="production"

RUN mkdir -p /app
WORKDIR /app

COPY components/authproxy/authproxy.js /app/authproxy.js

EXPOSE 8080
ENTRYPOINT ["node", "/app/authproxy.js"]
