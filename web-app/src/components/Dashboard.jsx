import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Dashboard.css'

function Dashboard({ stats, listingsCount }) {
  const chartData = [
    { date: '2026-04-14', profit: 15000, margin: 145 },
    { date: '2026-04-15', profit: 18500, margin: 162 },
    { date: '2026-04-16', profit: 22000, margin: 178 },
    { date: '2026-04-17', profit: 19500, margin: 155 },
    { date: '2026-04-18', profit: 25000, margin: 189 },
    { date: '2026-04-19', profit: 27500, margin: 205 },
    { date: '2026-04-20', profit: stats?.totalProfit || 0, margin: stats?.averageProfitMargin || 0 }
  ]

  return (
    <div className="dashboard">
      <h2>📊 ダッシュボード</h2>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">分析件数</div>
          <div className="stat-value">{stats?.totalAnalyzed || 0}</div>
          <div className="stat-unit">出品</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">総利益</div>
          <div className="stat-value">¥{(stats?.totalProfit || 0).toLocaleString()}</div>
          <div className="stat-unit">過去30日</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">平均利益</div>
          <div className="stat-value">¥{(stats?.averageProfitPerListing || 0).toLocaleString()}</div>
          <div className="stat-unit">1出品あたり</div>
        </div>

        <div className="stat-card success">
          <div className="stat-label">平均利益率</div>
          <div className="stat-value">{stats?.averageProfitMargin || 0}%</div>
          <div className="stat-unit">利益マージン</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-container">
        <div className="chart">
          <h3>利益推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => `¥${value.toLocaleString()}`}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#667eea"
                strokeWidth={2}
                dot={{ fill: '#667eea', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>利益率推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${value}%`}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Bar dataKey="margin" fill="#764ba2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary */}
      <div className="summary">
        <h3>📈 サマリー</h3>
        <div className="summary-content">
          <p>
            過去30日間で<strong>{stats?.totalAnalyzed || 0}件</strong>の出品を分析し、
            <strong>¥{(stats?.totalProfit || 0).toLocaleString()}</strong>の利益が見込まれます。
          </p>
          <p>
            1出品あたりの平均利益は<strong>¥{(stats?.averageProfitPerListing || 0).toLocaleString()}</strong>で、
            利益率は<strong>{stats?.averageProfitMargin || 0}%</strong>です。
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
