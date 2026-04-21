import { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Dashboard.css'

function Dashboard({ stats, listings = [] }) {
  // Build per-day chart data from real listings (last 7 days)
  const chartData = useMemo(() => {
    const days = 7
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]

      // Sum up profit from listings created on this date
      const dayListings = listings.filter(l => {
        const created = l.createdAt ? l.createdAt.split('T')[0] : ''
        return created === dateStr
      })

      const dayProfit = dayListings.reduce((sum, l) => sum + (l.profitAnalysis?.estimatedProfit || 0), 0)

      // Calculate average margin for the day
      const margins = dayListings
        .map(l => parseFloat(l.profitAnalysis?.profitMargin || 0))
        .filter(m => m > 0)
      const avgMargin = margins.length > 0
        ? parseFloat((margins.reduce((s, m) => s + m, 0) / margins.length).toFixed(1))
        : 0

      result.push({ date: dateStr, profit: dayProfit, margin: avgMargin })
    }

    return result
  }, [listings])

  // Totals computed directly from listings (more accurate than /api/stats for display)
  const totalProfit = listings.reduce((s, l) => s + (l.profitAnalysis?.estimatedProfit || 0), 0)
  const totalAnalyzed = stats?.totalAnalyzed ?? listings.filter(l => l.analyzed).length
  const avgProfit = listings.length > 0 ? Math.round(totalProfit / listings.length) : 0
  const margins = listings.map(l => parseFloat(l.profitAnalysis?.profitMargin || 0)).filter(m => m > 0)
  const avgMargin = margins.length > 0
    ? (margins.reduce((s, m) => s + m, 0) / margins.length).toFixed(1)
    : '0.0'

  return (
    <div className="dashboard">
      <h2>📊 ダッシュボード</h2>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">分析件数</div>
          <div className="stat-value">{totalAnalyzed}</div>
          <div className="stat-unit">出品</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">総利益</div>
          <div className="stat-value">¥{totalProfit.toLocaleString()}</div>
          <div className="stat-unit">過去30日</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">平均利益</div>
          <div className="stat-value">¥{avgProfit.toLocaleString()}</div>
          <div className="stat-unit">1出品あたり</div>
        </div>

        <div className="stat-card success">
          <div className="stat-label">平均利益率</div>
          <div className="stat-value">{avgMargin}%</div>
          <div className="stat-unit">利益マージン</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-container">
        <div className="chart">
          <h3>利益推移（過去7日）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => [`¥${value.toLocaleString()}`, '利益']}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="profit"
                name="利益"
                stroke="#667eea"
                strokeWidth={2}
                dot={{ fill: '#667eea', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>利益率推移（過去7日）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip
                formatter={(value) => [`${value}%`, '利益率']}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Bar dataKey="margin" name="利益率" fill="#764ba2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top listings table */}
      {listings.length > 0 && (
        <div className="top-listings">
          <h3>🏆 利益TOP出品</h3>
          <table className="mini-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>購入金額</th>
                <th>想定価値</th>
                <th>利益</th>
                <th>利益率</th>
                <th>ゲーム数</th>
              </tr>
            </thead>
            <tbody>
              {[...listings]
                .sort((a, b) => (b.profitAnalysis?.estimatedProfit || 0) - (a.profitAnalysis?.estimatedProfit || 0))
                .slice(0, 5)
                .map(l => (
                  <tr key={l.id} className={(l.profitAnalysis?.estimatedProfit || 0) > 0 ? 'profitable' : ''}>
                    <td>{l.title}</td>
                    <td>¥{(l.askingPrice || 0).toLocaleString()}</td>
                    <td>¥{(l.profitAnalysis?.estimatedIndividualValue || 0).toLocaleString()}</td>
                    <td className="profit-col">¥{(l.profitAnalysis?.estimatedProfit || 0).toLocaleString()}</td>
                    <td className="margin-col">{l.profitAnalysis?.profitMargin || 0}%</td>
                    <td>{l.profitAnalysis?.gamesCount || 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="summary">
        <h3>📈 サマリー</h3>
        <div className="summary-content">
          <p>
            過去30日間で<strong>{totalAnalyzed}件</strong>の出品を分析し、
            <strong>¥{totalProfit.toLocaleString()}</strong>の利益が見込まれます。
          </p>
          <p>
            1出品あたりの平均利益は<strong>¥{avgProfit.toLocaleString()}</strong>で、
            利益率は<strong>{avgMargin}%</strong>です。
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
