# Atlas 2.0.0: shared editor, persistent SQLite and version history.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY server ./server
COPY data ./data
COPY drizzle ./drizzle
COPY dist ./dist
COPY .openai ./.openai
RUN node scripts/build.mjs
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app /app
RUN mkdir /data && chown node:node /data
USER node
ENV DATA_DIR=/data PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/local.mjs"]
