# ==========================================
# Giai đoạn 1: Build ứng dụng React Vite (Builder)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy source code
COPY . .

# Build production bundle ra thư mục dist
RUN npm run build

# ==========================================
# Giai đoạn 2: Nginx Web Server (Production)
# ==========================================
FROM nginx:alpine AS runner

# Xóa cấu hình mặc định của Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copy file cấu hình Nginx SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files từ builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Mở cổng 80
EXPOSE 80

# Khởi chạy Nginx
CMD ["nginx", "-g", "daemon off;"]
