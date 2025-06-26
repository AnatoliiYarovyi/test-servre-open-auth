FROM node:22 as build

WORKDIR /app
COPY . .

ENV YARN_CACHE_FOLDER=/root/.yarn
RUN yarn install
RUN yarn build
RUN yarn add @libsql/linux-x64-gnu@0.4.7 --prefix=./dist

FROM --platform=linux/amd64 node:22-alpine
COPY --from=build /app/dist dist

CMD ["node", "dist"]