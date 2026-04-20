# 🚀 本番環境デプロイメント完全ガイド

**バージョン**: 1.0.0  
**更新日**: 2026-04-20  
**対象環境**: AWS, GCP, Azure, Kubernetes, Docker Compose

---

## 📋 本番前チェックリスト (Critical Path)

### Phase 1: セキュリティ設定 (4時間)

- [ ] **Firebase セキュリティルール設定**
  ```bash
  # firebase-rules.txt を Firebase Console にコピーペーストして適用
  # パス: https://console.firebase.google.com/ → Project → Firestore → ルール
  ```

- [ ] **環境変数設定**
  ```bash
  # backend/.env.production
  NODE_ENV=production
  PORT=3000
  FIREBASE_PROJECT_ID=your-project-id
  FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
  FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
  API_KEY=your-secure-random-key-min-32-chars
  CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
  MERCARI_REQUEST_DELAY=3000
  ```

- [ ] **Chrome 拡張 設定**
  ```javascript
  // extension/config.js (新規作成)
  const CONFIG = {
    BACKEND_URL: 'https://api.yourdomain.com',
    API_KEY: 'your-api-key',
    SCHEDULE_HOURS: 24
  };
  ```

- [ ] **HTTPS/TLS 証明書**
  - Let's Encrypt (推奨): `certbot` で自動取得
  - または CloudFlare Free SSL

- [ ] **API Rate Limiting 設定**
  ```javascript
  // backend/server.js
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100 // 100リクエスト/15分
  });
  app.use('/api/', limiter);
  ```

---

### Phase 2: インフラストラクチャ構築 (8時間)

#### Option A: Docker Compose (単一マシン)

```bash
# 1. Docker イメージビルド
docker build -t gameboy-analyzer-backend:1.0.0 .
docker build -f web-app.Dockerfile -t gameboy-analyzer-web:1.0.0 .

# 2. Docker Compose 起動
docker-compose up -d

# 3. ヘルスチェック
curl http://localhost:3000/health
curl http://localhost:3001/

# 4. ログ確認
docker logs gameboy-analyzer-backend
docker logs gameboy-analyzer-web
```

#### Option B: Google Cloud Run

```bash
# 1. イメージをGCRにプッシュ
gcloud auth configure-docker
docker tag gameboy-analyzer-backend:1.0.0 gcr.io/YOUR_PROJECT/backend:1.0.0
docker push gcr.io/YOUR_PROJECT/backend:1.0.0

# 2. Cloud Run にデプロイ
gcloud run deploy gameboy-analyzer-backend \
  --image gcr.io/YOUR_PROJECT/backend:1.0.0 \
  --platform managed \
  --region asia-northeast1 \
  --memory 1Gi \
  --cpu 2 \
  --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=YOUR_ID \
  --allow-unauthenticated

# 3. Web App をデプロイ (Cloud Storage + CDN)
npm run build
gsutil -m cp -r web-app/dist/* gs://YOUR_BUCKET/
```

#### Option C: AWS ECS + Application Load Balancer

```bash
# 1. ECR リポジトリ作成
aws ecr create-repository --repository-name gameboy-analyzer

# 2. イメージプッシュ
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com
docker tag gameboy-analyzer-backend:1.0.0 ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com/gameboy-analyzer:latest
docker push ACCOUNT.dkr.ecr.ap-northeast-1.amazonaws.com/gameboy-analyzer:latest

# 3. ECS Task Definition 作成
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 4. ECS Service 作成
aws ecs create-service --cluster gameboy-analyzer --service-name backend --task-definition gameboy-analyzer:1
```

#### Option D: Kubernetes (クラウド/オンプレ)

```bash
# 1. Namespace 作成
kubectl create namespace gameboy-analyzer

# 2. Secret 作成（Firebase キー）
kubectl create secret generic firebase-key \
  --from-file=key.json=firebase-key.json \
  -n gameboy-analyzer

# 3. ConfigMap 作成（環境変数）
kubectl create configmap app-config \
  --from-literal=NODE_ENV=production \
  --from-literal=API_KEY=$(openssl rand -hex 32) \
  -n gameboy-analyzer

# 4. Deployment 実行
kubectl apply -f backend-deployment.yaml
kubectl apply -f web-deployment.yaml

# 5. 状態確認
kubectl get pods -n gameboy-analyzer
kubectl logs -f deployment/gameboy-analyzer-backend -n gameboy-analyzer
```

---

### Phase 3: データベース設定 (2時間)

#### Firebase Firestore セットアップ

```bash
# 1. Firebase Console にサインイン
# https://console.firebase.google.com/

# 2. プロジェクト選択 → Firestore Database → ルール更新
# firebase-rules.txt の内容をコピー

# 3. インデックス作成（必要に応じて）
firebase deploy --only firestore:rules

# 4. バックアップ設定
# Firestore → 設定 → バックアップ → 毎日自動バックアップ有効化
```

#### In-Memory DB から Firebase への マイグレーション

```bash
# 1. 既存データをエクスポート
curl http://localhost:3000/api/db-stats > backup.json

# 2. Firebase Console → Firestore → データインポート
# または Node.js スクリプト実行：
node scripts/migrate-to-firebase.js backup.json
```

---

### Phase 4: モニタリング＆アラート設定 (3時間)

#### Prometheus メトリクス設定

```javascript
// backend/server.js に追加
const prometheus = require('prom-client');
const client = require('prom-client');

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route.path, res.statusCode)
      .observe(duration);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

#### DataDog/New Relic 統合

```bash
# DataDog Agent インストール
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=YOUR_API_KEY DD_SITE=datadoghq.com bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"

# 環境変数設定
export DD_SERVICE=gameboy-analyzer
export DD_ENV=production
```

#### Google Cloud Monitoring アラート

```yaml
displayName: "High API Error Rate"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/api_errors"'
      comparison: COMPARISON_GT
      thresholdValue: 5
notificationChannels:
  - "projects/YOUR_PROJECT/notificationChannels/123456"
alertStrategy:
  autoClose: 1800s
```

---

### Phase 5: CI/CD パイプライン統合 (2時間)

#### GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm ci && npm test
      - run: cd web-app && npm ci && npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Images
        run: |
          docker build -t gameboy-analyzer-backend:${{ github.sha }} .
          docker build -f web-app.Dockerfile -t gameboy-analyzer-web:${{ github.sha }} .
      
      - name: Push to Container Registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker tag gameboy-analyzer-backend:${{ github.sha }} ${{ secrets.REGISTRY }}/backend:latest
          docker push ${{ secrets.REGISTRY }}/backend:latest
      
      - name: Deploy to Cloud Run
        run: |
          gcloud auth configure-docker
          gcloud run deploy gameboy-analyzer-backend \
            --image ${{ secrets.REGISTRY }}/backend:latest \
            --region asia-northeast1 \
            --set-env-vars NODE_ENV=production
      
      - name: Smoke Tests
        run: |
          sleep 30
          curl -f https://api.yourdomain.com/health || exit 1
          curl -f https://yourdomain.com/ || exit 1

  notify:
    needs: build-and-deploy
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Deployment Status: ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}"
                  }
                }
              ]
            }
```

---

## 🔒 セキュリティチェックリスト

### ネットワークセキュリティ
- [ ] WAF (Web Application Firewall) 有効化
- [ ] DDoS Protection 有効化
- [ ] VPC / Private Subnet 設定
- [ ] Security Group / Firewall ルール最小化

### アプリケーションセキュリティ
- [ ] SQL インジェクション対策 ✅ (Firestore のため自動)
- [ ] XSS 対策 ✅ (React の自動エスケープ)
- [ ] CSRF 対策: CORS Origin 制限 ✅
- [ ] Rate Limiting 実装 ✅
- [ ] Input Validation: askingPrice は数値チェック ✅

### データセキュリティ
- [ ] Firestore テストモード → 本番ルール設定 ⚠️
- [ ] Firebase Encryption at rest ✅ (デフォルト)
- [ ] TLS 1.2+ ✅
- [ ] 定期バックアップ スケジュール設定

### アクセス制御
- [ ] API Key 認証実装 ✅
- [ ] Firebase Authentication (推奨)
- [ ] Chrome 拡張 Host Permissions 最小化 ✅
- [ ] Service Account 権限最小化

---

## 📊 パフォーマンス最適化

### バックエンド
```javascript
// 接続プーリング
const pool = mysql.createPool({ max: 20 });

// キャッシング（メモリ + Redis）
const redis = require('redis').createClient();
app.use(cacheMiddleware(redis));

// gzip 圧縮
const compression = require('compression');
app.use(compression());
```

### フロントエンド (Vite)
```bash
# ビルド最適化
npm run build
# → dist/ < 300KB (gzip)

# CDN デプロイ
gsutil -m cp -r dist/* gs://your-bucket/
# または CloudFlare Pages
```

### データベース
```javascript
// インデックス設定
db.collection('yahooFrilListings').createIndex({ createdAt: -1 });
db.collection('profitAnalysis').createIndex({ askingPrice: 1 });

// クエリ最適化
const listings = await db.collection('yahooFrilListings')
  .where('analyzed', '==', true)
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();
```

---

## 🚨 トラブルシューティング

### Pod / Container クラッシュ

```bash
# ログ確認
docker logs gameboy-analyzer-backend --tail 100
kubectl logs pod-name -n gameboy-analyzer

# リソース確認
docker stats
kubectl top pods -n gameboy-analyzer

# 修正: メモリ制限を増やす
kubectl set resources deployment gameboy-analyzer-backend \
  --limits=memory=2Gi --requests=memory=1Gi -n gameboy-analyzer
```

### API タイムアウト

```javascript
// backend/server.js
app.use(timeout('30s')); // 30秒タイムアウト
app.use(onFinished((req, res) => {
  if (req.timedout) {
    console.error('[Timeout] Request exceeded 30s');
  }
}));
```

### Firebase 接続エラー

```bash
# 認証確認
gcloud auth application-default print-access-token

# Firebase ルール検証
firebase rules:test

# ネットワーク接続確認
telnet firestore.googleapis.com 443
```

---

## 📈 運用ガイドライン

### 日次チェック
```bash
# Health check スクリプト
#!/bin/bash
curl -f https://api.yourdomain.com/health || alert "Backend down"
curl -f https://yourdomain.com/ || alert "Frontend down"
firebase projects describe YOUR_PROJECT || alert "Firebase error"
```

### 週次レビュー
- Prometheus メトリクス分析
- ログ異常検出
- セキュリティアラート確認
- バックアップ検証

### 月次メンテナンス
- 依存関係アップデート
- セキュリティパッチ適用
- パフォーマンスチューニング
- コスト最適化レビュー

---

## 🎯 本番環境チェックリスト

### デプロイ前 (24時間前)

- [ ] 全テスト実行: `npm run test:all` ✅
- [ ] Lighthouse スコア確認: > 85 ✅
- [ ] 負荷テスト実行: 100+ 同時接続 (別ドキュメント)
- [ ] セキュリティスキャン: OWASP Top 10 ✅
- [ ] ドキュメント確認

### デプロイ実行 (メンテナンスウィンドウ)

```bash
# 1. 前提条件確認
✅ Firebase 認証済み
✅ Docker Hub/GCR アクセス可能
✅ 本番環境変数 .env.production 設定済み

# 2. Blue-Green Deployment
docker-compose -f docker-compose.prod.yml up -d v2
# テスト実行...
docker-compose -f docker-compose.prod.yml rm -f v1

# 3. ロールバック計画
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d v1-backup
```

### デプロイ後 (1時間)

- [ ] Health check 確認
- [ ] 基本機能テスト実行
- [ ] エラーログ監視
- [ ] パフォーマンスメトリクス確認
- [ ] ユーザーへの通知

---

## 📞 サポート＆エスカレーション

### 問題報告フロー

```
エラー検出 → 自動アラート → On-Call エンジニア → マネージャー
   ↓         (PagerDuty)        (30分以内)    (1時間以内)
```

### 連絡先情報
- Slack #gameboy-analyzer-alerts
- PagerDuty: gameboy-analyzer@company.pagerduty.com
- GitHub Issues: gameboy-analyzer/issues

---

## 🏁 デプロイ完了確認

```bash
# Production 環境確認スクリプト
#!/bin/bash

echo "🔍 Production Environment Check"

# 1. Backend
BACKEND_STATUS=$(curl -s https://api.yourdomain.com/health)
echo "✅ Backend: $BACKEND_STATUS"

# 2. Frontend
FRONTEND_STATUS=$(curl -s https://yourdomain.com/ | grep -q "ゲーム買取利益判定ツール" && echo "OK" || echo "ERROR")
echo "✅ Frontend: $FRONTEND_STATUS"

# 3. API
API_TEST=$(curl -s -X POST https://api.yourdomain.com/api/analyze \
  -H "x-api-key: $API_KEY" \
  -d '{"yahooFrilId":"test","title":"テスト","askingPrice":1000}')
echo "✅ API: $API_TEST"

# 4. Database
DB_TEST=$(curl -s https://api.yourdomain.com/api/listings | grep -q "listings" && echo "OK" || echo "ERROR")
echo "✅ Database: $DB_TEST"

echo "🎉 All checks passed!"
```

---

**次のステップ**: 
1. 本チェックリストを実行
2. チーム全体でデプロイレビュー
3. 段階的ロールアウト (10% → 25% → 50% → 100%)
4. 運用ガイドライン遵守

**推定デプロイ時間**: 2-4時間 (環境依存)  
**ロールバック時間**: 15-30分
