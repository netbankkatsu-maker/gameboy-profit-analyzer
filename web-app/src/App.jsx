import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ListingTable from './components/ListingTable'
import HelpModal from './components/HelpModal'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // localStorage からキャッシュを初期値として使う
  const [listings, setListings] = useState(() => {
    try {
      const saved = localStorage.getItem('fril_listings')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  // スキャン進捗状態
  const [scanState, setScanState] = useState({
    active: false,
    stage: null,       // 'scraping' | 'analyzing' | 'done' | 'error'
    message: '',
    current: 0,
    total: 0,
    logs: [],
    error: null
  })

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // 統計のみ取得（軽量）
  async function fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/api/stats`)
      if (res.ok) setStats(await res.json())
    } catch (e) {
      console.error('stats fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // 出品一覧 + 統計を取得
  async function fetchData() {
    try {
      const [listingsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/listings`),
        fetch(`${API_BASE}/api/stats`)
      ])
      if (listingsRes.ok) {
        const data = await listingsRes.json()
        if (data.listings?.length > 0) {
          setListings(data.listings)
          try { localStorage.setItem('fril_listings', JSON.stringify(data.listings)) } catch {}
        }
      }
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (e) {
      console.error('fetchData error:', e)
    }
  }

  // ────────────────────────────────────────────
  // Fril スキャン（NDJSON ストリーミング）
  // ────────────────────────────────────────────
  async function scanFril() {
    if (scanState.active) return

    setScanState({
      active: true,
      stage: 'scraping',
      message: 'Yahoo Fril をスキャン中...',
      current: 0,
      total: 0,
      logs: [],
      error: null
    })
    setActiveTab('listings')

    try {
      const res = await fetch(`${API_BASE}/api/scan-fril?max=3`, { method: 'POST' })
      if (!res.ok) throw new Error(`サーバーエラー: HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 未完行をバッファに戻す

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            handleScanMessage(JSON.parse(line))
          } catch { /* JSON パース失敗は無視 */ }
        }
      }
    } catch (err) {
      setScanState(prev => ({
        ...prev,
        active: false,
        stage: 'error',
        message: `❌ ${err.message}`
      }))
    }
  }

  function handleScanMessage(msg) {
    switch (msg.stage) {
      case 'scraping':
        setScanState(prev => ({ ...prev, stage: 'scraping', message: msg.message || 'スクレイピング中...' }))
        break

      case 'analyzing':
        setScanState(prev => ({
          ...prev,
          stage: 'analyzing',
          message: `分析中 ${msg.current ?? prev.current}/${msg.total ?? prev.total} 件`,
          current: msg.current ?? prev.current,
          total:   msg.total   ?? prev.total,
          logs: msg.yahooId
            ? [...prev.logs, `🔍 ID: ${msg.yahooId}`]
            : prev.logs
        }))
        break

      case 'result': {
        const listing = msg.listing
        if (!listing) break
        setListings(prev => {
          const exists = prev.some(l =>
            (l.id && l.id === listing.id) ||
            (l.yahooId && l.yahooId === listing.yahooId)
          )
          const updated = exists ? prev : [listing, ...prev]
          try { localStorage.setItem('fril_listings', JSON.stringify(updated)) } catch {}
          return updated
        })
        setScanState(prev => ({
          ...prev,
          logs: [...prev.logs, `✅ ${(listing.title || listing.yahooId || '').substring(0, 28)}`]
        }))
        break
      }

      case 'done':
        setScanState(prev => ({
          ...prev,
          active: false,
          stage: 'done',
          message: msg.success
            ? `完了！ ${msg.analyzed} 件を分析しました`
            : (msg.message || '完了（出品データなし）')
        }))
        fetchStats()
        setTimeout(() => setScanState(prev => ({ ...prev, stage: null })), 6000)
        break

      case 'error':
        setScanState(prev => ({
          ...prev,
          active: false,
          stage: 'error',
          message: `❌ ${msg.message}`
        }))
        break
    }
  }

  const showPanel = scanState.active || scanState.stage === 'done' || scanState.stage === 'error'

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-text">
            <h1>🎮 ゲーム買取利益判定ツール</h1>
            <p>Yahoo Fril → メルカリ 利益分析ダッシュボード</p>
          </div>
          <button className="help-trigger-btn" onClick={() => setShowHelp(true)}>
            ❓ ヘルプ
          </button>
        </div>
      </header>

      {/* ─── スキャン進捗パネル ─── */}
      {showPanel && (
        <div className={`scan-panel scan-panel--${scanState.stage}`}>
          <div className="scan-panel__head">
            <span className="scan-panel__title">
              {scanState.active    ? '🔍 Frilスキャン中...'
               : scanState.stage === 'done'  ? '✅ スキャン完了'
               : '❌ スキャンエラー'}
            </span>
            {scanState.total > 0 && (
              <span className="scan-panel__count">
                {scanState.current} / {scanState.total} 件
              </span>
            )}
          </div>

          {scanState.total > 0 && (
            <div className="scan-panel__bar-wrap">
              <div
                className="scan-panel__bar-fill"
                style={{ width: `${Math.round(scanState.current / scanState.total * 100)}%` }}
              />
            </div>
          )}

          <div className="scan-panel__msg">{scanState.message}</div>

          {scanState.logs.length > 0 && (
            <div className="scan-panel__logs">
              {scanState.logs.slice(-4).map((log, i) => (
                <div key={i} className="scan-panel__log">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="app-nav">
        <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}>
          📊 ダッシュボード
        </button>
        <button className={`nav-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}>
          📋 出品一覧
        </button>
      </nav>

      <main className="app-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>データ読み込み中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard stats={stats} listings={listings} />}
            {activeTab === 'listings'  && (
              <ListingTable
                listings={listings}
                onRefresh={fetchData}
                onScan={scanFril}
                scanning={scanState.active}
              />
            )}
          </>
        )}
      </main>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default App
