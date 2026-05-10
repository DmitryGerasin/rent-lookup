FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npm run postinstall \
 && npm run build:assets \
   && npm prune --omit=dev \
   && npm cache clean --force

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "app.js"]
