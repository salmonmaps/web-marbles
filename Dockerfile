FROM node:12.20.0-buster-slim AS builder
RUN mkdir /app && apt-get update && apt-get install -y python build-essential
WORKDIR /app
COPY yarn.lock package.json .eslintrc.json ./
RUN yarn install
COPY external external/
COPY public public/
COPY templates templates/
COPY src src/
COPY tests test/
COPY scripts scripts/
RUN if [ ! -f src/client/config.user.js ]; then cp src/client/config.user.example.js src/client/config.user.js; fi
RUN yarn build:client
RUN if [ ! -f src/server/config.user.js ]; then cp src/server/config.user.example.js src/server/config.user.js; fi
RUN yarn build:server

FROM node:12.20.0-buster-slim
COPY --from=builder /app /app
EXPOSE 3004 3014
ENV DISCORD_ENABLED=false
WORKDIR /app
CMD yarn start
