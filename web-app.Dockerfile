# Web App用 Dockerfile (Nginx)

FROM node:20-alpine AS builder

WORKDIR /app/web-app

COPY web-app/package*.json ./
RUN npm ci

COPY web-app/ .
RUN npm run build

# Nginxで配信
FROM nginx:alpine

# Nginx設定
COPY nginx.conf /etc/nginx/nginx.conf

# ビルド成果物をコピー
COPY --from=builder /app/web-app/dist /usr/share/nginx/html

# ポート公開
EXPOSE 3001

# Nginxヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001 || exit 1

CMD ["nginx", "-g", "daemon off;"]
