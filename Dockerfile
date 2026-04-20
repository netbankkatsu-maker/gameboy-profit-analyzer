# マルチステージビルド
FROM node:20-alpine AS builder

WORKDIR /app

# バックエンド依存関係
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# ウェブアプリ依存関係とビルド
COPY web-app/package*.json ./web-app/
RUN cd web-app && npm ci

COPY web-app/ ./web-app/
RUN cd web-app && npm run build

# 本番イメージ
FROM node:20-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# バックエンドのみコピー
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/web-app/dist ./web-app/dist

COPY backend/firebase-key.example.json ./backend/firebase-key.json

# ポート公開
EXPOSE 3000 3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 本番環境設定
ENV NODE_ENV=production

CMD ["sh", "-c", "cd backend && node server.js"]
