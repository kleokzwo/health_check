FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/db


CMD ["npm", "start"]
