FROM node:20-slim

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY apps/frontend-host/package.json apps/frontend-host/package-lock.json ./
RUN npm ci --omit=dev

COPY apps/frontend/dist ./dist
COPY apps/frontend-host/server.js ./server.js

ENV PORT=8080
CMD ["npm", "start"]
