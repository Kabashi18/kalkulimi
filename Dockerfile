# Multi-stage Dockerfile për Kalkulimi i Shpenzimeve Fullstack App
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Instalo dependencies dhe bëj build frontend-in
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# 2. Instalo dependencies të backend-it
COPY package*.json ./
RUN npm ci --only=production

# 3. Fazat finale të ekzekutimit
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
