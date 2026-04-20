# 🔒 セキュリティ監査レポート

## 実施日: 2026-04-20
## 監査対象: ゲーム買取利益判定ツール (全5フェーズ)

---

## 概要

本ドキュメントは、アプリケーション全体のセキュリティ評価と改善提案を記載しています。

**総合評価: 🟡 中程度のセキュリティ**
- 開発・テスト環境: ✅ 十分
- 本番環境: ⚠️ 追加対応が必要

---

## Phase 1: Chrome拡張機能

### 🟢 安全な実装

✅ **Manifest V3対応**
- 古い Manifest V2 の脆弱性を回避
- より制限的なpermissionsモデル

✅ **正当なpermissions**
```json
"permissions": ["storage", "alarms", "scripting", "activeTab"],
"host_permissions": ["https://fril.jp/*", "https://jp.mercari.com/*"]
```

### 🟡 改善推奨事項

1. **【中】Host permissions の最小化**
   - 現在: ワイルドカード使用
   - 推奨: 特定のパスに限定
   ```json
   "host_permissions": [
     "https://fril.jp/search*",
     "https://jp.mercari.com/search*"
   ]
   ```

2. **【低】Content Security Policy (CSP)**
   - manifest.json に CSP を追加
   ```json
   "content_security_policy": {
     "extension_pages": "default-src 'self'; connect-src 'self' http://localhost:3000"
   }
   ```

3. **【低】外部リソース読み込みの制限**
   - popup.js でのインラインスクリプト使用
   - 推奨: 外部ファイルに移行

---

## Phase 2: 画像認識

### 🟢 安全な実装

✅ **モデルファイルの検証**
- TensorFlow.js モデルはローカルで実行
- 外部APIに画像を送信しない

✅ **エラーハンドリング**
- 無効なURLの処理
- タイムアウト設定

### 🟡 改善推奨事項

1. **【中】画像サイズ制限**
   - 現在: 制限なし
   - 推奨: 最大50MBに制限
   ```javascript
   const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
   if (imageData.length > MAX_IMAGE_SIZE) {
     throw new Error('Image too large');
   }
   ```

2. **【低】ファイルタイプ検証**
   - MIME typeチェック追加
   ```javascript
   const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
   if (!validMimeTypes.includes(mimeType)) {
     throw new Error('Invalid image type');
   }
   ```

---

## Phase 3: メルカリスクレイパー

### 🔴 重大な問題

1. **【高】メルカリ利用規約違反の可能性**
   - Puppeteer スクレイピング
   - メルカリ利用規約で禁止されている可能性
   
   **対策:**
   - [ ] メルカリ公式APIの利用検討
   - [ ] 利用規約確認とメルカリへの相談
   - [ ] スクレイピング回数制限（1日3回まで等）

### 🟡 改善推奨事項

1. **【中】Rate Limiting**
   ```javascript
   const rateLimiter = new Map();
   
   function checkRateLimit(key) {
     const last = rateLimiter.get(key) || 0;
     if (Date.now() - last < 5000) { // 5秒以上間隔
       throw new Error('Rate limited');
     }
     rateLimiter.set(key, Date.now());
   }
   ```

2. **【中】User-Agent ブロック対応**
   - ✅ 既に実装済み (5種類のUAローテーション)
   - 今後: プロキシ対応追加

3. **【低】ログ記録**
   - スクレイピング試行のログ
   - エラー分析用

---

## Phase 4: Firebase/データベース

### 🟢 安全な実装

✅ **認証機能**
- Service Account による認証
- firebase-key.json のセキュア管理

✅ **データ暗号化**
- Firebase デフォルト暗号化
- HTTPS通信のみ

### 🔴 重大な問題

1. **【高】Firestore セキュリティルール**
   - 現在: テストモード (誰でも読み書き可能)
   - 本番環境では必須修正
   
   **本番ルール例:**
   ```firestore
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### 🟡 改善推奨事項

1. **【中】ユーザー認証実装**
   - 現在: 認証なし
   - 推奨: Firebase Auth 統合
   ```javascript
   const user = await firebase.auth().currentUser;
   if (!user) throw new Error('Unauthorized');
   ```

2. **【中】APIキー管理**
   - firebase-key.json を .env で管理
   - サーバーサイドのみ使用（ブラウザから直接アクセスしない）

3. **【低】監査ログ**
   - データ変更のログ記録
   - Cloud Logging 統合

---

## Phase 5: React ダッシュボード

### 🟢 安全な実装

✅ **XSS対策**
- React の自動エスケープ機能
- ユーザー入力の適切な処理

✅ **HTTPS強制**
- 本番環境では必須

### 🟡 改善推奨事項

1. **【中】CORS設定の強化**
   - 現在: cors() デフォルト設定
   - 推奨:
   ```javascript
   app.use(cors({
     origin: ['http://localhost:3001', 'https://yourdomain.com'],
     credentials: true
   }));
   ```

2. **【中】入力値のバリデーション**
   - ユーザーが手動入力する場合
   ```javascript
   function validateGameTitle(title) {
     if (!/^[a-zA-Z0-9ぁ-ん\s]+$/.test(title)) {
       throw new Error('Invalid characters');
     }
     if (title.length > 100) {
       throw new Error('Title too long');
     }
   }
   ```

3. **【低】ヘッダーセキュリティ**
   - Helmet.js の導入
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

---

## API エンドポイント セキュリティ

### POST /api/analyze
```
入力検証: ✅ 必須
- yahooId: 文字列, 最大50文字
- askingPrice: 数値, 0-10,000,000
- imageUrls: 配列, 最大10個

出力: 
- パスワードなど機密情報を含めない ✅
- ユーザー識別情報は非表示 ⚠️
```

### GET /api/listings
```
認証: ⚠️ 現在なし
推奨: ユーザーは自分のデータのみアクセス

クエリパラメータ:
- limit: 最大100に制限
```

### GET /api/stats
```
認証: ⚠️ 現在なし
推奨: ユーザーは自分のデータのみ集計
```

---

## OWASP Top 10 対応表

| # | リスク | 状態 | 対策 |
|---|-------|------|------|
| 1 | Broken Access Control | 🟡 部分対応 | ユーザー認証実装 |
| 2 | Cryptographic Failures | 🟢 OK | HTTPS + Firebase暗号化 |
| 3 | Injection | 🟢 OK | React自動エスケープ |
| 4 | Insecure Design | 🟡 部分対応 | Firestore RLS設定 |
| 5 | Security Misconfiguration | 🟡 改善中 | Host permissions最小化 |
| 6 | Vulnerable Components | 🟡 定期更新推奨 | npm audit実施 |
| 7 | Authentication Failures | 🔴 未実装 | Firebase Auth導入 |
| 8 | Software Supply Chain | 🟢 OK | Dependabot有効化推奨 |
| 9 | Logging Monitoring | 🟡 部分対応 | Cloud Logging統合 |
| 10 | SSRF | 🟢 OK | URL検証済み |

---

## 本番環境チェックリスト

### 認証・認可
- [ ] Firebase Authentication 実装
- [ ] Firestore セキュリティルール設定
- [ ] API認証トークン生成 (JWT)
- [ ] ユーザーロール権限制御

### データセキュリティ
- [ ] firebase-key.json .gitignore 設定
- [ ] 環境変数の安全な管理
- [ ] データベースバックアップ設定
- [ ] 定期的なセキュリティ監査

### API セキュリティ
- [ ] CORS設定の限定
- [ ] Rate limiting 実装
- [ ] Input validation 強化
- [ ] Output encoding確認

### インフラセキュリティ
- [ ] HTTPS/TLS 強制
- [ ] セキュリティヘッダー設定 (Helmet.js)
- [ ] WAF (Web Application Firewall) 検討
- [ ] DDoS対策

### Chrome拡張
- [ ] Host permissions 最小化
- [ ] CSP (Content Security Policy) 追加
- [ ] Chrome Web Store レビュー対応
- [ ] 定期的なセキュリティアップデート

### 監査・監視
- [ ] CloudAudit Logs 設定
- [ ] エラーログ監視 (Sentry等)
- [ ] 異常アクセス検知
- [ ] 定期的なペネトレーション テスト

---

## 推奨事項の優先度

### 🔴 緊急 (本番デプロイ前に対応)
1. Firestore セキュリティルール設定
2. HTTPS 強制
3. Firebase Authentication 導入

### 🟡 高 (1ヶ月以内)
1. Host permissions 最小化
2. ユーザー認証実装
3. CORS設定強化
4. 利用規約確認 (メルカリスクレイピング)

### 🟢 中 (3ヶ月以内)
1. Rate limiting 実装
2. ログ・監査機能強化
3. ペネトレーション テスト実施
4. セキュリティドキュメント整備

---

## セキュリティ更新スケジュール

```
毎月:
- npm audit でのセキュリティアップデート確認
- ログ分析

四半期ごと:
- ペネトレーション テスト
- セキュリティ設定レビュー
- 外部セキュリティ監査

年1回:
- 完全なセキュリティ監査
- コンプライアンス確認 (GDPR等)
```

---

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Chrome拡張機能セキュリティ](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Firebase セキュリティ](https://firebase.google.com/docs/database/security)
- [Express セキュリティ](https://expressjs.com/en/advanced/best-practice-security.html)

