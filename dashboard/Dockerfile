FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY views ./views
RUN mkdir -p /app/db

CMD ["npm", "run", "start"]
