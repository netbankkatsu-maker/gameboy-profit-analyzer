# 🎮 ゲーム買取利益判定ツール

Yahoo Frilのゲームボーイまとめ売り出品から、自動的にゲームソフトを認識し、メルカリの過去売上データから利益を計算するツール。

## プロジェクト構成

```
project-root/
├── extension/                    # Chrome拡張機能
│   ├── manifest.json
│   ├── service-worker.js        # 定期実行トリガー
│   ├── popup.html               # UI
│   ├── popup.js                 # ロジック
│   └── images/                  # アイコン
│
├── backend/                     # Node.js + Express
│   ├── server.js                # メインサーバー
│   ├── package.json
│   ├── .env.example
│   ├── controllers/
│   │   └── analyzeController.js # 分析ロジック
│   └── services/
│       ├── imageRecognition.js  # 画像認識 (Phase 2)
│       ├── mercariScraper.js    # 価格取得 (Phase 3)
│       ├── firebaseDB.js        # DB連携 (Phase 4)
│       └── gameDatabase.js      # ゲーム参照データ
│
└── web-app/                     # React ダッシュボード (Phase 5)
    ├── package.json
    ├── src/
    │   ├── components/
    │   ├── services/
    │   ├── App.jsx
    │   └── index.css
    └── vite.config.js
```

## 実装段階

### Phase 1: Chrome拡張機能基盤 ✅ (完了)
- [x] manifest.json (Manifest V3)
- [x] Service Worker (定期実行スケジューラー)
- [x] Popup UI (手動トリガー)
- [x] バックエンド基本構造 (Express)
- [x] 分析コントローラー

### Phase 2: 画像認識エンジン (次)
- [ ] TensorFlow.js モデルの統合
- [ ] ゲームボーイゲーム分類モデルの学習
- [ ] `/api/recognize-image` エンドポイント

### Phase 3: メルカリ価格データ取得
- [ ] Puppeteer Mercari スクレイパー
- [ ] 価格履歴キャッシング
- [ ] `/api/mercari-price` エンドポイント

### Phase 4: Firebase統合
- [ ] Firestore セットアップ
- [ ] Database schema 実装
- [ ] Cloud Functions 連携

### Phase 5: ウェブアプリダッシュボード
- [ ] React + Vite プロジェクト
- [ ] ダッシュボード UI
- [ ] リアルタイムデータ表示

## セットアップ

### 前提条件
- Node.js 16+ (バックエンド)
- Chrome / Chromium ブラウザ
- Google Cloud Account (Firebase用)

### インストール

#### 1. バックエンドのセットアップ

```bash
cd backend
npm install

# .env ファイル作成 (Phase 4で完全設定)
cp .env.example .env

# 開発サーバー起動
npm run dev
```

#### 2. Chrome拡張機能のインストール

1. `chrome://extensions` を開く
2. 「デベロッパー モード」を有効化 (右上)
3. 「フォルダを選択して拡張機能を読み込む」
4. `extension/` フォルダを選択

#### 3. テスト

```bash
# バックエンドヘルスチェック
curl http://localhost:3000/health

# 拡張機能のポップアップから「今すぐ分析」をクリック
```

## API リファレンス

### POST /api/analyze
出品を分析して、ゲームを認識・利益を計算

**リクエスト:**
```json
{
  "yahooId": "l123456",
  "title": "ゲームボーイまとめ売り",
  "askingPrice": 15000,
  "imageUrls": ["url1", "url2"],
  "listingUrl": "https://fril.jp/item/...",
  "createdAt": "2026-04-20T10:00:00Z"
}
```

**レスポンス:**
```json
{
  "yahooId": "l123456",
  "title": "ゲームボーイまとめ売り",
  "askingPrice": 15000,
  "recognizedGames": [
    {
      "gameName": "ポケットモンスター赤",
      "confidence": 0.92,
      "averagePrice": 8500
    }
  ],
  "profitAnalysis": {
    "totalAskingPrice": 15000,
    "gamesCount": 5,
    "estimatedIndividualValue": 42500,
    "estimatedProfit": 27500,
    "profitMargin": "183%"
  },
  "status": "success"
}
```

### GET /api/mercari-price?gameName={title}
ゲームの平均単価を取得 (Phase 3)

### GET /api/listings
全出品データを取得 (Phase 4)

## 開発ガイド

### Chrome拡張機能のデバッグ

1. `chrome://extensions` 開く
2. 拡張機能を右クリック → 「バックグラウンドページを検査」
3. Console でログ確認

```javascript
// Service Worker で実行
chrome.storage.local.get(['analysisHistory'], (result) => {
  console.log(result);
});
```

### バックエンドのテスト

```bash
# 単一出品をテスト
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "yahooId": "test123",
    "title": "テスト出品",
    "askingPrice": 10000,
    "imageUrls": ["https://example.com/image.jpg"]
  }'
```

## トラブルシューティング

### 拡張機能がバックエンドに接続できない
- バックエンド (http://localhost:3000) が起動しているか確認
- CORS エラーの場合、`manifest.json` の `host_permissions` 確認

### 画像認識がうまくいかない (Phase 2)
- confidence < 0.7 のゲームは手動確認が必要
- ポップアップで手動入力オプション実装予定

## ロードマップ

- **v1.0**: Phase 1 完了 - Chrome拡張機能基本動作
- **v1.1**: Phase 2 - 画像認識機能
- **v1.2**: Phase 3 - メルカリ連携
- **v2.0**: Phase 4 & 5 - Firebase + ダッシュボード

## ライセンス

MIT
