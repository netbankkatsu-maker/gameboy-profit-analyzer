# 🚀 本番環境デプロイメントガイド

## デプロイメント前チェックリスト

### セキュリティ
- [ ] Firebase Firestore セキュリティルール設定
- [ ] Firebase Authentication 実装
- [ ] HTTPS/TLS 証明書取得
- [ ] API認証トークン生成
- [ ] Host permissions 最小化
- [ ] Content Security Policy 設定
- [ ] firebase-key.json を .gitignore に追加
- [ ] 環境変数を .env で管理

### パフォーマンス
- [ ] キャッシング戦略実装
- [ ] Gzip 圧縮有効化
- [ ] CDN 統合
- [ ] Lighthouse スコア 85以上
- [ ] API応答時間 < 200ms
- [ ] バンドルサイズ < 200KB

### テスト
- [ ] ユニットテスト合格
- [ ] E2E テスト合格
- [ ] ブラウザ互換性テスト
- [ ] ロード テスト (100+ 同時接続)
- [ ] セキュリティペネトレーション テスト

### ドキュメント
- [ ] デプロイメント手順書
- [ ] ランブック (復旧手順)
- [ ] API ドキュメント
- [ ] アーキテクチャ図
- [ ] 本番パスワード管理

---

## Docker での本番環境構築

### 1. Docker Image ビルド

```bash
# バックエンドイメージ
docker build -t gameboy-analyzer-backend:1.0.0 .

# ウェブアプリイメージ
docker build -f web-app.Dockerfile -t gameboy-analyzer-web:1.0.0 .
```

### 2. Docker Registry にプッシュ

```bash
# Docker Hub の場合
docker tag gameboy-analyzer-backend:1.0.0 yourusername/gameboy-analyzer-backend:1.0.0
docker push yourusername/gameboy-analyzer-backend:1.0.0

docker tag gameboy-analyzer-web:1.0.0 yourusername/gameboy-analyzer-web:1.0.0
docker push yourusername/gameboy-analyzer-web:1.0.0

# または GCR (Google Container Registry)
docker tag gameboy-analyzer-backend:1.0.0 gcr.io/your-project/backend:1.0.0
docker push gcr.io/your-project/backend:1.0.0
```

### 3. Docker Compose で起動

```bash
docker-compose up -d
```

### 4. ヘルスチェック

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

---

## クラウドデプロイメント

### Google Cloud Run での デプロイ

#### バックエンド

```bash
# Dockerfile を使用してビルド
gcloud run deploy gameboy-analyzer-backend \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars FIREBASE_KEY_PATH=/workspace/firebase-key.json \
  --allow-unauthenticated

# Firebase Key をシークレットとして管理
gcloud secrets create firebase-key --data-file=firebase-key.json
gcloud run services update gameboy-analyzer-backend \
  --set-env-vars FIREBASE_KEY_PATH=/workspace/firebase-key.json
```

#### Web App

```bash
# Node.js サーバーで配信
gcloud run deploy gameboy-analyzer-web \
  --source ./web-app \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=https://backend-url.run.app
```

### AWS ECS での デプロイ

```bash
# ECR リポジトリ作成
aws ecr create-repository --repository-name gameboy-analyzer

# イメージをプッシュ
docker tag gameboy-analyzer-backend:1.0.0 \
  {AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com/gameboy-analyzer:latest

docker push {AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-1.amazonaws.com/gameboy-analyzer:latest

# ECS Cluster で実行
aws ecs run-task \
  --cluster gameboy-analyzer \
  --task-definition gameboy-analyzer:1
```

---

## Kubernetes デプロイ

### Deployment 設定

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gameboy-analyzer-backend
  labels:
    app: gameboy-analyzer
    component: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gameboy-analyzer
      component: backend
  template:
    metadata:
      labels:
        app: gameboy-analyzer
        component: backend
    spec:
      containers:
      - name: backend
        image: yourusername/gameboy-analyzer-backend:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: FIREBASE_KEY_PATH
          value: /etc/firebase/firebase-key.json
        volumeMounts:
        - name: firebase-keys
          mountPath: /etc/firebase
          readOnly: true
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: firebase-keys
        secret:
          secretName: firebase-key

---
apiVersion: v1
kind: Service
metadata:
  name: gameboy-analyzer-backend
spec:
  selector:
    app: gameboy-analyzer
    component: backend
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: LoadBalancer

```

### デプロイコマンド

```bash
# シークレット作成
kubectl create secret generic firebase-key \
  --from-file=firebase-key.json=./firebase-key.json

# Deployment 作成
kubectl apply -f backend-deployment.yaml
kubectl apply -f web-deployment.yaml

# 状態確認
kubectl get deployments
kubectl get pods
kubectl get services

# ログ確認
kubectl logs -f deployment/gameboy-analyzer-backend
```

---

## CI/CD パイプライン設定

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd web-app && npm install
      - run: cd web-app && npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Images
        run: |
          docker build -t backend:${{ github.sha }} .
          docker build -f web-app.Dockerfile -t web:${{ github.sha }} .
      
      - name: Push to Registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag backend:${{ github.sha }} yourusername/backend:latest
          docker push yourusername/backend:latest
      
      - name: Deploy to Cloud Run
        run: |
          gcloud auth configure-docker
          gcloud run deploy backend --image yourusername/backend:latest
```

---

## 本番環境操作ガイド

### ログ監視

```bash
# バックエンド ログ
docker logs -f gameboy-analyzer-backend

# エラーログ抽出
docker logs gameboy-analyzer-backend 2>&1 | grep ERROR

# 外部ログシステムに統合 (Datadog, New Relic等)
```

### スケーリング

```bash
# Docker Compose でのスケーリング
docker-compose up -d --scale backend=3

# Kubernetes でのスケーリング
kubectl scale deployment gameboy-analyzer-backend --replicas=5
```

### バージョンアップ

```bash
# 新しいイメージをビルド
docker build -t gameboy-analyzer-backend:2.0.0 .

# Blue-Green Deployment パターン
docker-compose up -d backend_v2  # 新バージョン起動
# テスト...
docker-compose rm backend_v1  # 旧バージョン停止
```

### ロールバック

```bash
# 前のバージョンに戻す
docker run -d --name backend_backup \
  gameboy-analyzer-backend:1.0.0
docker-compose stop backend
docker-compose rm backend
docker rename backend_backup backend
docker-compose up -d backend
```

---

## 監視と アラート

### Prometheus メトリクス

```javascript
// backend/server.js 統合例
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
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
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Alerting Rules

```yaml
groups:
- name: gameboy-analyzer
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"
  
  - alert: HighMemoryUsage
    expr: container_memory_usage_bytes / 1024 / 1024 > 900
    for: 5m
    annotations:
      summary: "Memory usage > 900MB"
```

---

## トラブルシューティング

### Pod がCrash Loop している場合

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
```

### メモリ不足

```bash
kubectl top nodes
kubectl top pods
# リソースリクエストを増やす
kubectl set resources deployment gameboy-analyzer-backend \
  --limits=memory=2Gi --requests=memory=1Gi
```

### データベース接続エラー

```bash
# Firebase credentials 確認
ls -la firebase-key.json
echo $FIREBASE_KEY_PATH

# Firebase への接続テスト
node -e "const firebase = require('firebase-admin'); console.log('OK')"
```

---

## チェックリスト

### 本番環境セットアップ
- [ ] Docker イメージビルド完了
- [ ] レジストリにプッシュ完了
- [ ] Kubernetes/Cloud Run でのデプロイ確認
- [ ] CI/CD パイプライン設定完了
- [ ] ロード バランサー設定完了
- [ ] SSL/TLS 証明書設定完了

### 監視・アラート
- [ ] Prometheus メトリクス設定
- [ ] Alerting Rules 設定
- [ ] ログ集約設定 (ELK, Datadog等)
- [ ] On-call ローテーション設定

### セキュリティ
- [ ] ファイアウォール設定
- [ ] VPC / ネットワーク設定
- [ ] シークレット管理設定
- [ ] バックアップ設定

### 最適化
- [ ] パフォーマンスチューニング
- [ ] CDN 設定
- [ ] キャッシング戦略実装
- [ ] オートスケーリング設定

