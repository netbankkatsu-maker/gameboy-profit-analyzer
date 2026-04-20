import { useState } from 'react'
import './HelpModal.css'

const SECTIONS = [
  {
    id: 'overview',
    icon: '🎮',
    title: 'このツールとは',
    content: (
      <div>
        <p>
          Yahoo Fril に出品されている<strong>ゲームボーイソフトのまとめ売り</strong>を自動で分析し、
          メルカリの相場データから<strong>利益を計算する買取判定ツール</strong>です。
        </p>
        <div className="help-flow">
          <div className="help-flow-step">
            <span className="help-flow-icon">🔍</span>
            <span>Yahoo Fril<br/>出品を発見</span>
          </div>
          <div className="help-flow-arrow">→</div>
          <div className="help-flow-step">
            <span className="help-flow-icon">🖼️</span>
            <span>画像から<br/>ゲームを認識</span>
          </div>
          <div className="help-flow-arrow">→</div>
          <div className="help-flow-step">
            <span className="help-flow-icon">💴</span>
            <span>メルカリで<br/>相場を取得</span>
          </div>
          <div className="help-flow-arrow">→</div>
          <div className="help-flow-step">
            <span className="help-flow-icon">📊</span>
            <span>利益を<br/>計算・表示</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: 'ダッシュボード',
    content: (
      <div>
        <p>分析結果の集計を一目で確認できます。</p>
        <ul className="help-list">
          <li>
            <strong>分析件数</strong> — 過去30日で分析した出品の総数
          </li>
          <li>
            <strong>総利益</strong> — 全出品の推定利益の合計
          </li>
          <li>
            <strong>平均利益</strong> — 1出品あたりの平均利益額
          </li>
          <li>
            <strong>平均利益率</strong> — (利益 ÷ 購入金額) × 100
          </li>
          <li>
            <strong>利益推移グラフ</strong> — 過去7日間の日別利益の折れ線グラフ。データ点にホバーすると金額を表示
          </li>
          <li>
            <strong>利益率推移グラフ</strong> — 日別の利益率棒グラフ
          </li>
          <li>
            <strong>利益TOP出品</strong> — 利益が高い順に上位5件を一覧表示
          </li>
        </ul>
        <div className="help-tip">💡 ダッシュボードは10秒ごとに自動更新されます</div>
      </div>
    )
  },
  {
    id: 'listings',
    icon: '📋',
    title: '出品一覧',
    content: (
      <div>
        <p>全出品の詳細データをソート・フィルタして確認できます。</p>
        <ul className="help-list">
          <li>
            <strong>ソート</strong> — 「利益（高い順）」「利益率（高い順）」「出品日（新しい順）」で並び替え
          </li>
          <li>
            <strong>最小利益フィルタ</strong> — スライダーで表示する最低利益額を設定。¥0〜¥50,000
          </li>
          <li>
            <strong>購入金額</strong> — Yahoo Fril での出品価格
          </li>
          <li>
            <strong>想定価値</strong> — 含まれるゲームをメルカリ相場で個別売却した場合の合計
          </li>
          <li>
            <strong>利益</strong> — 想定価値 − 購入金額（緑色 = 黒字）
          </li>
          <li>
            <strong>ゲーム数</strong> — 画像認識で特定できたゲームソフトの本数
          </li>
          <li>
            <strong>→ ボタン</strong> — 出品の詳細ページへ移動
          </li>
        </ul>
        <div className="help-tip">💡 🔄 更新ボタンで手動で最新データを取得できます</div>
      </div>
    )
  },
  {
    id: 'extension',
    icon: '🧩',
    title: 'Chrome拡張機能',
    content: (
      <div>
        <p>Yahoo Frilを見ながらワンクリックで分析を実行できます。</p>
        <ol className="help-list help-list-ol">
          <li>
            Chromeで <code>chrome://extensions</code> を開く
          </li>
          <li>
            右上の「デベロッパーモード」をオンにする
          </li>
          <li>
            「パッケージ化されていない拡張機能を読み込む」をクリック
          </li>
          <li>
            <code>extension/</code> フォルダを選択
          </li>
          <li>
            Yahoo Frilでゲームボーイソフトのページを開く
          </li>
          <li>
            ツールバーのアイコンをクリック → 「今すぐ分析」
          </li>
        </ol>
        <div className="help-tip">
          ⏰ 拡張機能は24時間ごとに自動でYahoo Frilをスキャンします
        </div>
        <div className="help-tip">
          📊 「ダッシュボード」ボタンでこの画面を開けます
        </div>
      </div>
    )
  },
  {
    id: 'api',
    icon: '⚡',
    title: '手動でAPIを使う',
    content: (
      <div>
        <p>バックエンドAPIを直接叩いて分析を実行することもできます。</p>
        <div className="help-code-block">
          <div className="help-code-label">新しい出品を分析</div>
          <code>
{`POST http://localhost:3000/api/analyze
Content-Type: application/json

{
  "yahooId": "出品ID",
  "title": "商品タイトル",
  "askingPrice": 3000,
  "imageUrls": ["画像URL1", "画像URL2"]
}`}
          </code>
        </div>
        <div className="help-code-block">
          <div className="help-code-label">出品一覧を取得</div>
          <code>GET http://localhost:3000/api/listings</code>
        </div>
        <div className="help-code-block">
          <div className="help-code-label">統計を取得</div>
          <code>GET http://localhost:3000/api/stats</code>
        </div>
        <div className="help-code-block">
          <div className="help-code-label">デモデータを再生成</div>
          <code>POST http://localhost:3000/api/seed</code>
        </div>
      </div>
    )
  },
  {
    id: 'profit',
    icon: '💴',
    title: '利益の計算方法',
    content: (
      <div>
        <div className="help-formula">
          <div className="help-formula-row">
            <span className="help-formula-label">想定価値</span>
            <span className="help-formula-eq">=</span>
            <span>認識したゲーム各タイトルのメルカリ平均落札価格 の合計</span>
          </div>
          <div className="help-formula-row">
            <span className="help-formula-label">推定利益</span>
            <span className="help-formula-eq">=</span>
            <span>想定価値 − Yahoo Frilの購入金額</span>
          </div>
          <div className="help-formula-row">
            <span className="help-formula-label">利益率</span>
            <span className="help-formula-eq">=</span>
            <span>推定利益 ÷ 購入金額 × 100 (%)</span>
          </div>
        </div>
        <ul className="help-list" style={{marginTop: '1rem'}}>
          <li>メルカリ相場は<strong>過去の売れた価格</strong>（sold）の平均を使用</li>
          <li>ゲーム認識の<strong>信頼度が70%以上</strong>のタイトルのみ計算対象</li>
          <li>相場取得に失敗した場合はモックデータで代替</li>
          <li>送料・手数料は含まれていないので実際の利益はここから差し引いてください</li>
        </ul>
        <div className="help-tip">
          ⚠️ メルカリ送料（175〜1,600円）とフリマ手数料（10%）を差し引いた額が実質利益です
        </div>
      </div>
    )
  }
]

export default function HelpModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('overview')
  const current = SECTIONS.find(s => s.id === activeSection)

  return (
    <div className="help-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="help-modal">
        {/* Header */}
        <div className="help-modal-header">
          <h2>📖 使い方ガイド</h2>
          <button className="help-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="help-modal-body">
          {/* Sidebar */}
          <nav className="help-sidebar">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                className={`help-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <span className="help-nav-icon">{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="help-content">
            <h3 className="help-section-title">
              {current.icon} {current.title}
            </h3>
            <div className="help-section-body">
              {current.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
