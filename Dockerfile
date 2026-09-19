# Container recipe v1.0.0; serves Atlas UI v1.1.1 without a build step.
# Override NGINX_IMAGE with an immutable digest for reproducible deployments.
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:stable-alpine
FROM ${NGINX_IMAGE}
COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
