# 🔧 Firebase セットアップガイド

## 概要
本アプリケーションは Firebase Firestore を使用してデータを永続化します。開発環境ではメモリDB、本番環境では Firebase を使用できます。

---

## クイックスタート (開発環境)

### 開発環境ではこのままで動作します
```bash
cd backend
npm install
node server.js
```

**自動的に in-memory DB が使用されます。データは起動中のみ保持されます。**

---

## Firebase 本番環境セットアップ

### ステップ 1: Firebase Project 作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名: `gameboy-profit-analyzer`
4. Google Analytics: 有効化（推奨）

### ステップ 2: Firestore Database 初期化

1. Firebase Console → 左メニュー「Firestore Database」
2. 「データベースを作成」をクリック
3. ロケーション: `asia-northeast1` (東京)
4. セキュリティルール: **「テストモード」を選択**

### ステップ 3: Service Account キーを生成

1. Firebase Console → 設定アイコン (⚙️)
2. 「プロジェクト設定」 → 「サービスアカウント」タブ
3. 「新しい秘密鍵を生成」をクリック
4. JSON ファイルが自動ダウンロードされます

### ステップ 4: キーファイルを配置

```bash
# ダウンロードしたファイルを名前変更して配置
mv ~/Downloads/gameboy-*.json backend/firebase-key.json
```

### ステップ 5: 環境変数を設定

```bash
# backend/.env を作成
echo "FIREBASE_KEY_PATH=./firebase-key.json" >> backend/.env
```

### ステップ 6: サーバー再起動

```bash
cd backend
npm install  # 初回のみ
node server.js
```

**ログに以下が表示されたら成功:**
```
[Firebase] Connected to Firebase Firestore
```

---

## Firestore セキュリティルール (本番環境)

**⚠️ テストモード終了後（推奨: 30日以内）、以下のセキュリティルールを適用してください:**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー認証を実装するまでのルール
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## データベーススキーマ

### Collection: `yahooFrilListings`
```json
{
  "yahooId": "string",
  "title": "string",
  "askingPrice": 15000,
  "imageUrls": ["url1", "url2"],
  "listingUrl": "string",
  "createdAt": "timestamp",
  "analyzedAt": "timestamp"
}
```

### Collection: `recognizedGames`
```json
{
  "listingId": "string",
  "gameName": "string",
  "confidence": 0.92,
  "averagePrice": 8500,
  "priceRange": { "min": 7000, "max": 10000 },
  "recognizedAt": "timestamp"
}
```

### Collection: `profitAnalysis`
```json
{
  "listingId": "string",
  "totalAskingPrice": 15000,
  "gamesCount": 5,
  "estimatedIndividualValue": 42500,
  "estimatedProfit": 27500,
  "profitMargin": "183%",
  "createdAt": "timestamp"
}
```

---

## トラブルシューティング

### エラー: "firebase-admin が見つからない"
```bash
cd backend
npm install firebase-admin
```

### エラー: "firebase-key.json が見つからない"
- `backend/firebase-key.json` が存在することを確認
- `.gitignore` に `firebase-key.json` が含まれていることを確認

### エラー: "Permission denied"
- Firestore セキュリティルールが「テストモード」に設定されていることを確認
- または、ユーザー認証を実装してください

### Firestore データを確認したい
1. Firebase Console → Firestore Database
2. Collection を選択 → ドキュメントを閲覧可能

---

## ローカル開発でのデータ永続化

メモリDBのデータをファイルに保存したい場合:

```javascript
// backend/services/firebaseDB.js の最後に追加

const fs = require('fs');

function saveMemoryDBToFile() {
  fs.writeFileSync('memory-db-backup.json', JSON.stringify(memoryDB, null, 2));
  console.log('[Firebase] Memory DB saved to file');
}

function loadMemoryDBFromFile() {
  if (fs.existsSync('memory-db-backup.json')) {
    const data = fs.readFileSync('memory-db-backup.json', 'utf-8');
    Object.assign(memoryDB, JSON.parse(data));
    console.log('[Firebase] Memory DB restored from file');
  }
}

// サーバー起動時に復元
loadMemoryDBFromFile();

// 定期的に保存 (1分ごと)
setInterval(saveMemoryDBToFile, 60000);
```

---

## 本番環境チェックリスト

- [ ] Firebase Project 作成済み
- [ ] Firestore Database 初期化済み
- [ ] Service Account キー生成済み
- [ ] `backend/firebase-key.json` 配置済み
- [ ] `backend/.env` に `FIREBASE_KEY_PATH` 設定済み
- [ ] Firestore セキュリティルール設定済み
- [ ] ユーザー認証実装済み（オプション）
- [ ] テストデータ削除済み
- [ ] バックアップ戦略設定済み

---

## 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Admin SDK ドキュメント](https://firebase.google.com/docs/admin/setup)
- [Firestore セキュリティルール](https://firebase.google.com/docs/firestore/security/start)
- [Firebase 料金ページ](https://firebase.google.com/pricing)

**無料枠: 毎月50,000回の読み取り / 20,000回の書き込み**
