FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

# copy source code
COPY src ./src

EXPOSE 3000
CMD ["npm", "start"]
