FROM node:22 as build

WORKDIR /app
COPY . .

RUN npm i -g pnpm
RUN pnpm install
RUN pnpm run build
RUN pnpm add @libsql/linux-x64-gnu@0.4.7 --prefix=./dist

FROM --platform=linux/amd64 node:22-alpine
COPY --from=build /app/dist ./dist

CMD ["node", "dist"]