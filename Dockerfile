# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.16.0
FROM node:22-alpine3.19
RUN apk update && apk add --no-cache python3 py3-pip  make g++
# NodeJS app lives here
WORKDIR /usr/app
COPY ./ /usr/app


# Install node modules
COPY --link package.json package-lock.json 
RUN npm install -g node-gyp
RUN npm install underscore
RUN npm install @mapbox/node-pre-gyp
CMD node index.js
