import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ListingTable from './components/ListingTable'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [listings, setListings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [listingsRes, statsRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/stats')
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
        <h1>🎮 ゲーム買取利益判定ツール</h1>
        <p>Yahoo Fril → メルカリ 利益分析ダッシュボード</p>
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
              <Dashboard stats={stats} listingsCount={listings.length} />
            )}
            {activeTab === 'listings' && (
              <ListingTable listings={listings} onRefresh={fetchData} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
