FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
# if you have it
COPY package-lock.json ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/db

CMD ["npm","start"]
