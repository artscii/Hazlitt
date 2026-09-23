FROM node:24-alpine
WORKDIR /monitor
COPY monitor/*.mjs ./
RUN chmod -R a+rX /monitor
EXPOSE 8080
CMD ["node","server.mjs"]
