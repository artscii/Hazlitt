# Atlas 2.0.0: shared editor, persistent SQLite and version history.
FROM node:24-alpine AS build
RUN apk add --no-cache chromium
ENV CHROMIUM_PATH=/usr/bin/chromium
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY scripts ./scripts
COPY src ./src
COPY pilot ./pilot
COPY monitor ./monitor
COPY compose*.yaml ./
ARG ATLAS_SOURCE_REVISION
ENV ATLAS_SOURCE_REVISION=$ATLAS_SOURCE_REVISION
COPY server ./server
COPY data ./data
COPY drizzle ./drizzle
COPY dist ./dist
COPY .openai ./.openai
RUN node scripts/build.mjs && npm prune --omit=dev
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
# Git checkouts with a restrictive umask must still be readable by the runtime user.
RUN chmod -R a+rX /app && mkdir /data && chown node:node /data
USER node
# Fail the image build if the runtime user cannot read startup code or migrations.
RUN node --check server/local.mjs && node --input-type=module -e "import fs from 'node:fs'; await import('./server/request-origin.mjs'); await import('./dist/server/index.js'); for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql'))) fs.readFileSync('drizzle/'+name)"
ENV DATA_DIR=/data PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/local.mjs"]
