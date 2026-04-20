# 🌐 ブラウザテスト実行ガイド

## クイックスタート (3ステップ)

### ステップ 1: バックエンド起動

```bash
cd backend
npm install
node server.js
```

**期待される出力:**
```
[Firebase] Using in-memory database for development
[Server] Running on http://localhost:3000
```

### ステップ 2: Web App 起動 (新しいターミナル)

```bash
cd web-app
npm install
npm run dev
```

**期待される出力:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3001/
```

### ステップ 3: ブラウザでアクセス

1. Chrome/Firefox を開く
2. `http://localhost:3001` にアクセス
3. ダッシュボードが表示されることを確認

---

## テストシナリオ

### 🎯 シナリオ 1: 基本動作確認

#### テスト内容:
1. Dashboard ページをロード
2. 統計情報が表示される
3. グラフが描画される

#### 期待値:
- [ ] ページロード時間 < 2秒
- [ ] Dashboard タブがアクティブ
- [ ] グラフが正しくレンダリング
- [ ] 統計値が表示（全て0で OK）

#### バグ検出ポイント:
- ❌ 白い画面 → コンソールエラー確認
- ❌ グラフ描画失敗 → Network タブで API 確認
- ❌ レイアウト崩れ → ウィンドウサイズ変更してテスト

---

### 🎯 シナリオ 2: 出品一覧表示

#### テスト内容:
1. 「📋 出品一覧」タブをクリック
2. テーブルが表示される
3. ソート・フィルタ機能をテスト

#### 期待値:
- [ ] タブ切り替えがスムーズ
- [ ] テーブルが正しくフォーマット
- [ ] ソートドロップダウンが動作
- [ ] スライダーフィルタが動作

#### バグ検出ポイント:
- ❌ テーブルが空 → API エラー確認
- ❌ ソートが機能しない → ブラウザコンソール確認
- ❌ スライダーが固い → CSS 確認

---

### 🎯 シナリオ 3: リアルタイムデータ更新

#### テスト内容:
1. Dashboard で「🔄 更新」ボタンをクリック
2. データが更新されることを確認
3. 複数回クリック

#### 期待値:
- [ ] ボタンクリック後、アイコンが回転
- [ ] 1-2秒後にデータが更新
- [ ] ローディング表示が消える
- [ ] 複数クリックしてもエラーが出ない

#### バグ検出ポイント:
- ❌ ボタンが反応しない → イベントリスナー確認
- ❌ ローディングが止まらない → ネットワークタイムアウト
- ❌ データが古いまま → キャッシュ問題

---

### 🎯 シナリオ 4: レスポンシブデザイン

#### テスト内容:
1. Chrome DevTools を開く (F12)
2. デバイス別にテスト:
   - Mobile: 375×812px
   - Tablet: 768×1024px
   - Desktop: 1280×720px

#### 期待値:
- [ ] Mobile: ナビが縦積み、フォントが読みやすい
- [ ] Tablet: テーブルがスクロール可能
- [ ] Desktop: グラフが横並び

#### バグ検出ポイント:
- ❌ 文字が重なる → CSS メディアクエリ確認
- ❌ テーブルが切れる → width 設定確認
- ❌ タッチ動作がぎこちない → イベント確認

---

### 🎯 シナリオ 5: Chrome拡張機能テスト

#### テスト内容:
1. Chrome: `chrome://extensions/`
2. 「デベロッパー モード」を有効化
3. 「フォルダを選択して拡張機能を読み込む」
4. `/extension` フォルダを選択
5. 拡張機能アイコンをクリック

#### 期待値:
- [ ] ポップアップが表示
- [ ] 「今すぐ分析」ボタンが表示
- [ ] ステータス情報が表示
- [ ] 「ダッシュボード」リンクが表示

#### バグ検出ポイント:
- ❌ ポップアップが白い → manifest.json エラー
- ❌ ボタンが反応しない → Service Worker ログ確認
- ❌ バックエンド接続失敗 → CORS エラー確認

---

## デバッグ方法

### ブラウザコンソール (Chrome DevTools)

```
F12キー → Console タブ
```

**確認すべきエラー:**
```
❌ CORS エラー → backend/server.js の cors() 設定確認
❌ Network エラー → サーバーが起動しているか確認
❌ undefined is not a function → コンポーネント読み込み失敗
```

### Network タブでの確認

```
F12キー → Network タブ
```

**API リクエスト確認:**
- [ ] GET /api/listings → 200 OK
- [ ] GET /api/stats → 200 OK
- [ ] レスポンス時間 < 200ms

### Service Worker ログ (Chrome拡張)

```
chrome://extensions/
  ↓
gameboy-analyzer → 「バックグラウンドページを検査」
  ↓
Console タブ
```

**確認すべきログ:**
```
[Extension] Service Worker started ✓
[Firebase] Using in-memory database ✓
[Analyze] Starting analysis... ✓
```

---

## パフォーマンス測定

### Lighthouse スコア確認

```
Chrome DevTools → Lighthouse タブ
  → "Analyze page load" をクリック
```

**目標スコア:**
- Performance: 85+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### 応答時間測定

```javascript
// ブラウザコンソールで実行
console.time('API');
fetch('/api/listings').then(() => console.timeEnd('API'));
```

**期待値:** < 200ms

---

## よくあるバグと対応

| バグ | 原因 | 対応 |
|-----|------|------|
| **白い画面** | Reactコンポーネント読み込み失敗 | ブラウザコンソール確認 |
| **CORS エラー** | バックエンド起動していない | backend も起動確認 |
| **グラフが描画されない** | Recharts の読み込み失敗 | Network タブでリソース確認 |
| **テーブルが空** | 初期データなし | 「🔄 更新」ボタンクリック |
| **レイアウト崩れ** | CSS 読み込み失敗 | DevTools で CSS 確認 |
| **ポップアップ表示されない** | manifest.json エラー | chrome://extensions/errors |
| **「ダッシュボード」リンク開かない** | localhost:3001 に接続できない | ファイアウォール確認 |

---

## テスト結果の記録

各シナリオをテストしたら、以下の表を記入してください:

### Dashboard ページ
- [ ] ページロード成功
- [ ] 統計カードが表示
- [ ] グラフが描画
- [ ] スムーズなアニメーション
- **バグ:** なし / あり (詳細:       )

### 出品一覧ページ
- [ ] テーブル表示
- [ ] ソート機能
- [ ] フィルタ機能
- [ ] スクロール動作
- **バグ:** なし / あり (詳細:       )

### リアルタイム更新
- [ ] 更新ボタン反応
- [ ] ローディング表示
- [ ] データ更新成功
- [ ] エラー処理
- **バグ:** なし / あり (詳細:       )

### レスポンシブ
- [ ] Mobile 対応
- [ ] Tablet 対応
- [ ] Desktop 対応
- [ ] すべての向き対応
- **バグ:** なし / あり (詳細:       )

### Chrome 拡張
- [ ] ポップアップ表示
- [ ] 分析実行
- [ ] データ保存
- [ ] バックエンド連携
- **バグ:** なし / あり (詳細:       )

---

## テスト完了後

全てのテストが完了したら:

1. **バグレポートを確認**
   ```bash
   cat BUG_REPORT.md
   ```

2. **本番環境デプロイメント準備**
   ```bash
   cat DEPLOYMENT.md
   ```

3. **セキュリティレビュー**
   ```bash
   cat SECURITY_AUDIT.md
   ```

4. **パフォーマンス最適化**
   ```bash
   cat PERFORMANCE.md
   ```

---

## サポート

### よく見るエラーメッセージ

```
❌ Error: connect ECONNREFUSED 127.0.0.1:3000
   → backend を起動していない

❌ SyntaxError: Unexpected token < in JSON at position 0
   → API から HTML が返されている (404)

❌ TypeError: Cannot read property 'listings' of undefined
   → API レスポンス形式が異なる

❌ Warning: React is running in development mode
   → 正常です（本番では消える）
```

### 追加のデバッグコマンド

```bash
# ポート確認 (既に使用されているか)
netstat -an | grep 3000

# プロセス確認
lsof -i :3000

# ローカルホストの接続テスト
telnet localhost 3000

# API の直接テスト
curl -s http://localhost:3000/health | jq
```

