# ==========================================
# Giai đoạn 1: Build ứng dụng (Builder)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Cài đặt các gói hệ thống cần thiết cho Prisma và MariaDB Adapter
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Cài đặt dependencies
RUN npm install

# Copy Prisma schema và generate Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code và tiến hành build TypeScript
COPY src ./src/
RUN npm run build

# ==========================================
# Giai đoạn 2: Production Runner
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat tzdata
ENV TZ=Asia/Ho_Chi_Minh
ENV NODE_ENV=production

# Copy node_modules và build output từ builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Mở cổng 5000
EXPOSE 5000

# Khởi chạy server
CMD ["node", "dist/server.js"]
