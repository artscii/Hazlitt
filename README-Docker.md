# Hazlitt Creek Evidence Atlas — Docker

Container recipe 1.0.0 packages the existing Atlas UI 1.2.3. The site is static:
no Node.js build, database, API keys, or environment variables are required.
All site assets are included; external research links still require internet access.

## Run

Install and start Docker Desktop (macOS/Windows) or Docker Engine with Compose
(Linux). From this directory:

```sh
docker compose up --build -d
```

Open http://localhost:8081. Stop with `docker compose down`.

## Dockerfile recipe without Compose

```sh
docker build --pull -t hazlitt-creek-evidence-atlas:1.2.3 .
docker run -d --name hazlitt-atlas --restart unless-stopped \
  -p 127.0.0.1:8081:8080 hazlitt-creek-evidence-atlas:1.2.3
```

Stop/remove with `docker rm -f hazlitt-atlas`.

## Verify

```sh
docker compose ps
curl --fail http://localhost:8081/healthz
curl --fail -I http://localhost:8081/
curl --fail -I http://localhost:8081/app.js
curl --fail -I http://localhost:8081/style.css
curl --fail -I http://localhost:8081/map.svg
docker compose logs atlas
```

The health endpoint returns `ok`. The container should become healthy within
30 seconds. Open the page to check the Bombo default selection, map tooltips,
and profile navigation.

## Editing and deployment

Edit `dist/index.html`, `dist/style.css`, and `dist/app.js`, then rerun
`docker compose up --build -d` to bake changes into the image. The map is `dist/map.svg`.
The current Docker package does not change the existing hosted site.

The default port binding is local to your computer. For a server, configure
your HTTPS reverse proxy to forward to port 8080; change the host binding only
if network access is intended. The image serves the atlas at the domain root.
There is no authentication layer in this container.

The recipe uses the upstream non-root NGINX Alpine image and its port 8080.
It can be built on supported Intel and Apple Silicon Docker hosts without a
hard-coded platform. Documentation:
https://github.com/nginx/docker-nginx-unprivileged

The `stable-alpine` tag tracks upstream updates. For reproducible production
builds, supply your verified image digest:

```sh
docker build --build-arg NGINX_IMAGE=nginxinc/nginx-unprivileged@sha256:YOUR_VERIFIED_DIGEST \
  -t hazlitt-creek-evidence-atlas:1.2.3 .
```

## Validation status

Packaged assets and configuration were inspected. Docker is not available in
the authoring environment, so an actual container build/run has not been tested.
Use the verification commands above after starting Docker.
