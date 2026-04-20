import { useState } from 'react'
import './ListingTable.css'

function ListingTable({ listings, onRefresh }) {
  const [sortBy, setSortBy] = useState('profit')
  const [filterMin, setFilterMin] = useState(0)

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
        <button className="refresh-btn" onClick={onRefresh}>🔄 更新</button>
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
            type="range"
            min="0"
            max="50000"
            step="1000"
            value={filterMin}
            onChange={(e) => setFilterMin(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="listing-table">
          <thead>
            <tr>
              <th>Yahoo ID</th>
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

                return (
                  <tr key={listing.id} className={profit > 0 ? 'profitable' : ''}>
                    <td className="yahoo-id">{listing.yahooId}</td>
                    <td className="title">{listing.title}</td>
                    <td className="price">¥{listing.askingPrice?.toLocaleString()}</td>
                    <td className="price">¥{(listing.profitAnalysis?.estimatedIndividualValue || 0).toLocaleString()}</td>
                    <td className="profit-col">¥{profit.toLocaleString()}</td>
                    <td className="margin-col">{margin}%</td>
                    <td className="center">{gameCount}</td>
                    <td className="center">
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
    </div>
  )
}

export default ListingTable
