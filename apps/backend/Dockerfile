# syntax=docker/dockerfile:1.6

FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Install production + build-time deps for the backend workspace
COPY package.json package-lock.json ./
COPY tsconfig.base.json tsconfig.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/backend/tsconfig.json apps/backend/
COPY apps/backend/tsconfig.build.json apps/backend/
RUN npm ci --workspace backend

# Copy backend sources and build the TypeScript project
COPY apps/backend/src apps/backend/src
RUN npm run build --workspace backend
# Reinstall backend dependencies locally without workspace linking so runtime has everything needed
RUN npm install --prefix apps/backend --omit=dev --install-links=false --package-lock=false

FROM node:20-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /usr/src/app/apps/backend/dist ./dist
COPY --from=builder /usr/src/app/apps/backend/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/backend/package.json ./package.json

EXPOSE 8080
CMD ["node", "dist/index.js"]
