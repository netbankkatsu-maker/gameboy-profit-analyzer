#!/bin/bash
set -e

echo "🚀 ゲーム買取利益判定ツール - 本番環境セットアップ"
echo "=================================================="

# 1. API Key生成
echo ""
echo "1️⃣  API Key 生成中..."
API_KEY=$(openssl rand -hex 32)
echo "✅ API Key: $API_KEY"
echo "   → .env.production に設定してください"

# 2. Firebase設定確認
echo ""
echo "2️⃣  Firebase 設定確認"
if [ -f "firebase-key.json" ]; then
    echo "✅ firebase-key.json が見つかりました"
    PROJECT_ID=$(cat firebase-key.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('project_id', 'N/A'))")
    echo "   Project ID: $PROJECT_ID"
else
    echo "⚠️  firebase-key.json が見つかりません"
    echo "   Firebase Console から Service Account キーをダウンロードしてください"
fi

# 3. SSL/TLS証定書確認
echo ""
echo "3️⃣  SSL/TLS 証定書設定"
if [ -f "/etc/letsencrypt/live/yourdomain.com/fullchain.pem" ]; then
    echo "✅ Let's Encrypt 証定書が見つかりました"
else
    echo "⚠️  SSL証定書が見つかりません"
    echo "   以下のコマンドで自動取得してください："
    echo "   certbot certonly --standalone -d yourdomain.com"
fi

# 4. Docker イメージビルド
echo ""
echo "4️⃣  Docker イメージビルド中..."
docker build -t gameboy-analyzer-backend:1.0.0 .
docker build -f web-app.Dockerfile -t gameboy-analyzer-web:1.0.0 .
echo "✅ イメージビルド完了"

# 5. イメージタグ付与
echo ""
echo "5️⃣  レジストリへのタグ付与"
read -p "   Docker Hub ユーザー名を入力: " DOCKER_USER
docker tag gameboy-analyzer-backend:1.0.0 $DOCKER_USER/gameboy-analyzer-backend:1.0.0
docker tag gameboy-analyzer-web:1.0.0 $DOCKER_USER/gameboy-analyzer-web:1.0.0
echo "✅ タグ付与完了"

# 6. 環境変数ファイル検証
echo ""
echo "6️⃣  環境変数ファイル検証"
if grep -q "API_KEY=your_key" .env.production; then
    echo "⚠️  .env.production に実際の値を設定してください"
else
    echo "✅ 環境変数ファイルが設定されています"
fi

# 7. ヘルスチェック
echo ""
echo "7️⃣  ローカルヘルスチェック"
echo "   バックエンド: $(curl -s http://localhost:3000/health | grep -o 'running' && echo '✅' || echo '❌')"
echo "   ウェブアプリ: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 | grep -q '200' && echo '✅' || echo '❌')"

# 8. デプロイメント準備チェックリスト
echo ""
echo "=================================="
echo "📋 本番環境デプロイメント チェックリスト"
echo "=================================="
echo ""
echo "必須項目："
echo "  [ ] Firebase セキュリティルール を適用済みか確認"
echo "  [ ] API_KEY を .env.production に設定"
echo "  [ ] firebase-key.json をサーバーに配置"
echo "  [ ] SSL/TLS 証定書を設定"
echo "  [ ] DNS レコード (yourdomain.com) を設定"
echo ""
echo "推奨項目："
echo "  [ ] Prometheus メトリクス設定"
echo "  [ ] Slack アラート統合"
echo "  [ ] CloudFlare CDN 設定"
echo "  [ ] バックアップスケジュール設定"
echo ""

# 9. デプロイメント実行確認
echo ""
read -p "本番環境へのデプロイメントを実行しますか？ (y/N): " DEPLOY
if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
    echo "🚀 デプロイメント開始..."

    # Docker イメージプッシュ
    echo "   Docker イメージをレジストリにプッシュ中..."
    read -p "   Docker パスワードを入力: " DOCKER_PASS
    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
    docker push $DOCKER_USER/gameboy-analyzer-backend:1.0.0
    docker push $DOCKER_USER/gameboy-analyzer-web:1.0.0
    echo "✅ イメージプッシュ完了"

    # Cloud Run デプロイ (GCP の場合)
    echo ""
    echo "   デプロイ方法を選択："
    echo "   1) Docker Compose (単一サーバー)"
    echo "   2) Google Cloud Run"
    echo "   3) AWS ECS"
    echo "   4) Kubernetes"
    read -p "   選択 (1-4): " DEPLOY_METHOD

    case $DEPLOY_METHOD in
        1)
            echo "   docker-compose up -d で本番環境を起動します"
            ;;
        2)
            echo "   gcloud run deploy コマンドを実行してください"
            echo "   参照: PRODUCTION_DEPLOYMENT.md"
            ;;
        3)
            echo "   aws ecs コマンドを実行してください"
            echo "   参照: PRODUCTION_DEPLOYMENT.md"
            ;;
        4)
            echo "   kubectl apply コマンドを実行してください"
            echo "   参照: PRODUCTION_DEPLOYMENT.md"
            ;;
    esac
else
    echo "⏸️  デプロイメントをキャンセルしました"
fi

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "次のステップ:"
echo "  1. PRODUCTION_DEPLOYMENT.md を参照して本番環境をセットアップ"
echo "  2. Smoke テストを実行"
echo "  3. モニタリングダッシュボードを設定"
