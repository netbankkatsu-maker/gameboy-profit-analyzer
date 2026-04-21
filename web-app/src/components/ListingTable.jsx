import { useState } from 'react'
import './ListingTable.css'

// ───────────────────────────────────────────
// Detail Modal
// ───────────────────────────────────────────
function DetailModal({ listing, onClose }) {
  const pa = listing.profitAnalysis || {}
  const games = pa.details || []
  const imageUrl = listing.imageUrls?.[0] || null
  const frilUrl = listing.listingUrl || (listing.yahooId && !listing.yahooId.startsWith('fril-demo')
    ? `https://paypayfleamarket.yahoo.co.jp/item/${listing.yahooId}`
    : null)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📦 出品詳細</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* 商品画像 */}
          <div className="modal-image-wrap">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={listing.title}
                className="modal-image"
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="modal-image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
              🎮 画像なし
            </div>
          </div>

          {/* 基本情報 */}
          <div className="modal-info">
            <h4 className="modal-title">{listing.title}</h4>

            <div className="modal-meta">
              <span className="meta-label">Yahoo ID</span>
              <span className="meta-value">
                {frilUrl
                  ? <a href={frilUrl} target="_blank" rel="noreferrer">{listing.yahooId?.substring(0, 16)}…</a>
                  : listing.yahooId}
              </span>
            </div>

            {/* 利益サマリー */}
            <div className="modal-profit-cards">
              <div className="profit-card">
                <div className="profit-card-label">購入金額</div>
                <div className="profit-card-value cost">¥{(listing.askingPrice || 0).toLocaleString()}</div>
              </div>
              <div className="profit-card">
                <div className="profit-card-label">想定売却額</div>
                <div className="profit-card-value">¥{(pa.estimatedIndividualValue || 0).toLocaleString()}</div>
              </div>
              <div className="profit-card highlight">
                <div className="profit-card-label">推定利益</div>
                <div className="profit-card-value profit">¥{(pa.estimatedProfit || 0).toLocaleString()}</div>
              </div>
              <div className="profit-card">
                <div className="profit-card-label">利益率</div>
                <div className="profit-card-value margin">{pa.profitMargin || 0}%</div>
              </div>
            </div>

            {/* 認識ゲーム一覧 */}
            {games.length > 0 && (
              <div className="modal-games">
                <h5>🎮 認識ゲーム（{games.length}本）</h5>
                <table className="games-table">
                  <thead>
                    <tr>
                      <th>機種</th>
                      <th>ゲーム名</th>
                      <th>信頼度</th>
                      <th>メルカリ相場</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((g, i) => {
                      const searchWord = g.searchTerm || g.gameName
                      const mercariUrl = `https://jp.mercari.com/search?keyword=${encodeURIComponent(searchWord)}&status=sold_out`
                      const platClass = g.platform === 'GBA' ? 'plat-gba' : g.platform === 'GBC' ? 'plat-gbc' : 'plat-gb'
                      return (
                        <tr key={i}>
                          <td className="plat-cell">
                            {g.platform && (
                              <span className={`plat-badge ${platClass}`}>{g.platform || 'GB'}</span>
                            )}
                          </td>
                          <td>
                            <a href={mercariUrl} target="_blank" rel="noreferrer">
                              {g.gameName}
                            </a>
                          </td>
                          <td className="conf">
                            <span className={`conf-badge ${g.confidence >= 0.8 ? 'high' : g.confidence >= 0.5 ? 'mid' : 'low'}`}>
                              {Math.round(g.confidence * 100)}%
                            </span>
                          </td>
                          <td className="game-price">¥{(g.averagePrice || 0).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {games.length === 0 && (
              <p className="no-games">ゲームを認識できませんでした（画像品質が低い可能性があります）</p>
            )}
          </div>
        </div>

        {frilUrl && (
          <div className="modal-footer">
            <a href={frilUrl} target="_blank" rel="noreferrer" className="fril-link-btn">
              🔗 Yahoo!フリマで確認
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────
// Main ListingTable
// ───────────────────────────────────────────
function ListingTable({ listings, onRefresh, onScan, scanning }) {
  const [sortBy, setSortBy] = useState('profit')
  const [filterMin, setFilterMin] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState(null) // 'ok' | 'error' | null
  const [selectedListing, setSelectedListing] = useState(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshStatus(null)
    try {
      await onRefresh()
      setRefreshStatus('ok')
      setTimeout(() => setRefreshStatus(null), 2000)
    } catch {
      setRefreshStatus('error')
      setTimeout(() => setRefreshStatus(null), 3000)
    } finally {
      setRefreshing(false)
    }
  }

  const sortedListings = [...listings]
    .filter(l => (l.profitAnalysis?.estimatedProfit || 0) >= filterMin)
    .sort((a, b) => {
      const aProfit = a.profitAnalysis?.estimatedProfit || 0
      const bProfit = b.profitAnalysis?.estimatedProfit || 0
      const aMargin = a.profitAnalysis?.profitMargin || 0
      const bMargin = b.profitAnalysis?.profitMargin || 0
      if (sortBy === 'profit') return bProfit - aProfit
      if (sortBy === 'margin') return bMargin - aMargin
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  return (
    <div className="listing-table-container">
      <div className="table-header">
        <h2>📋 出品一覧</h2>
        <div className="table-actions">
          <button
            className={`refresh-btn ${refreshing ? 'loading' : ''} ${refreshStatus === 'ok' ? 'success' : ''} ${refreshStatus === 'error' ? 'error' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing || scanning}
          >
            {refreshing ? '⏳ 更新中...' : refreshStatus === 'ok' ? '✅ 更新しました' : refreshStatus === 'error' ? '❌ エラー' : '🔄 更新'}
          </button>
        </div>
      </div>

      <div className="table-filters">
        <div className="filter-group">
          <label>ソート:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="profit">利益 (高い順)</option>
            <option value="margin">利益率 (高い順)</option>
            <option value="date">出品日 (新しい順)</option>
          </select>
        </div>
        <div className="filter-group">
          <label>最小利益: ¥{filterMin.toLocaleString()}</label>
          <input
            type="range" min="0" max="50000" step="1000"
            value={filterMin}
            onChange={(e) => setFilterMin(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="listing-table">
          <thead>
            <tr>
              <th>画像</th>
              <th>タイトル</th>
              <th>購入金額</th>
              <th>想定価値</th>
              <th>利益</th>
              <th>利益率</th>
              <th>ゲーム数</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            {sortedListings.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="8">出品データがありません</td>
              </tr>
            ) : (
              sortedListings.map((listing) => {
                const profit = listing.profitAnalysis?.estimatedProfit || 0
                const margin = listing.profitAnalysis?.profitMargin || 0
                const gameCount = listing.profitAnalysis?.gamesCount || 0
                const thumb = listing.imageUrls?.[0] || null

                return (
                  <tr
                    key={listing.id || listing.yahooId}
                    className={profit > 0 ? 'profitable' : ''}
                    onClick={() => setSelectedListing(listing)}
                    style={{ cursor: 'pointer' }}
                    title="クリックで詳細を表示"
                  >
                    <td className="thumb-cell">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="thumb-img"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="thumb-placeholder">🎮</div>
                      )}
                    </td>
                    <td className="title">{listing.title}</td>
                    <td className="price">¥{listing.askingPrice?.toLocaleString()}</td>
                    <td className="price">¥{(listing.profitAnalysis?.estimatedIndividualValue || 0).toLocaleString()}</td>
                    <td className="profit-col">¥{profit.toLocaleString()}</td>
                    <td className="margin-col">{margin}%</td>
                    <td className="center">{gameCount}</td>
                    <td className="center" onClick={e => { e.stopPropagation(); setSelectedListing(listing) }}>
                      <button className="detail-btn">→</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <p>合計 {sortedListings.length} 件の出品</p>
        <p>総利益: ¥{sortedListings.reduce((sum, l) => sum + (l.profitAnalysis?.estimatedProfit || 0), 0).toLocaleString()}</p>
      </div>

      {selectedListing && (
        <DetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  )
}

export default ListingTable
