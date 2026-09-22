FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates cmake build-essential git python3 && rm -rf /var/lib/apt/lists/*
ENV PYTHON=/usr/bin/python3
WORKDIR /app
COPY pilot/package*.json ./pilot/
RUN npm ci --prefix pilot
COPY pilot/*.mjs ./pilot/
COPY dist/search.js ./dist/search.js
RUN mkdir /data && chown node:node /data
ENV QMD_FORCE_CPU=1 QMD_DATA_DIR=/data PORT=8080
USER node
EXPOSE 8080
CMD ["node", "pilot/server.mjs"]
