import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ListingTable from './components/ListingTable'
import HelpModal from './components/HelpModal'
import './App.css'

// API base URL — uses VITE_API_URL in production, falls back to Vite proxy in dev
const API_BASE = import.meta.env.VITE_API_URL || ''

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [listingsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/listings`),
        fetch(`${API_BASE}/api/stats`)
      ])

      if (listingsRes.ok) {
        const data = await listingsRes.json()
        setListings(data.listings || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-text">
            <h1>🎮 ゲーム買取利益判定ツール</h1>
            <p>Yahoo Fril → メルカリ 利益分析ダッシュボード</p>
          </div>
          <button
            className="help-trigger-btn"
            onClick={() => setShowHelp(true)}
            title="使い方ガイドを開く"
          >
            ❓ ヘルプ
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 ダッシュボード
        </button>
        <button
          className={`nav-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}
        >
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
            {activeTab === 'dashboard' && (
              <Dashboard stats={stats} listings={listings} />
            )}
            {activeTab === 'listings' && (
              <ListingTable listings={listings} onRefresh={fetchData} />
            )}
          </>
        )}
      </main>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default App
