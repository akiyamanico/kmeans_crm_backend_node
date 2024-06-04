# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.16.0
FROM node:alpine

LABEL fly_launch_runtime="NodeJS"

# NodeJS app lives here
WORKDIR /usr/app
COPY ./ /usr/app

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y python-is-python3 pkg-config build-essential 

# Install node modules
COPY --link package.json package-lock.json 
RUN npm install

# Copy application code
COPY --link . .


# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
CMD [ "npm", "run", "start" ]
