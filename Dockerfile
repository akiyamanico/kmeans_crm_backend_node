# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.16.0
FROM node:alpine
RUN apk update && apk add --no-cache python3 py3-pip  make g++
# NodeJS app lives here
WORKDIR /usr/app
COPY ./ /usr/app


# Install node modules
COPY --link package.json package-lock.json 
RUN npm install -g node-gyp
RUN npm install


# Start the server by default, this can be overwritten at runtime
CMD [ "npm", "run", "start" ]
