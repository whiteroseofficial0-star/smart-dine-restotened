# Production image for Render / Railway / Fly.io / any Docker host.
# The app runs a custom Next.js server (server.ts) because it needs Socket.IO.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma needs the DATABASE_URL at generate time; it is only used to build the client.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
RUN mkdir -p uploads
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
