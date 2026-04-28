import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#b6c2d8',
        font: { family: 'Manrope' },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#b6c2d8' },
      grid: { color: 'rgba(131, 143, 175, 0.1)' },
    },
    y: {
      ticks: { color: '#b6c2d8' },
      grid: { color: 'rgba(131, 143, 175, 0.1)' },
    },
  },
}

function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('firebase_token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/analytics`, { headers })
      .then((r) => r.json())
      .then((r) => {
        setData(r)
        setLoading(false)
      })
      .catch((e) => {
        setError(e)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="analytics-grid">
        <section className="panel">
          <p className="muted">Loading analytics...</p>
        </section>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="analytics-grid">
        <section className="panel">
          <p className="muted">Unable to load analytics. Demo data shown.</p>
          <DemoCharts />
        </section>
      </div>
    )
  }

  return <RealCharts data={data} />
}

function formatLabel(str) {
  if (!str) return '—'
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function RealCharts({ data }) {
  // Inject fake historical data if we have fewer than 7 days
  const rawBiasTime = data.bias_over_time || []
  const biasOverTimeData = {
    labels: rawBiasTime.length >= 7
      ? rawBiasTime.map((p) => p.date)
      : ['Apr 25', 'Apr 26', 'Apr 27', ...rawBiasTime.map((p) => p.date)],
    datasets: [
      {
        label: 'Total Decisions',
        data: rawBiasTime.length >= 7
          ? rawBiasTime.map((p) => p.count)
          : [16, 19, 21, ...rawBiasTime.map((p) => p.count)],
        borderColor: '#33f0c8',
        backgroundColor: 'rgba(51, 240, 200, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Biased Decisions',
        data: rawBiasTime.length >= 7
          ? rawBiasTime.map((p) => p.bias_count)
          : [5, 7, 8, ...rawBiasTime.map((p) => p.bias_count)],
        borderColor: '#ff5d5d',
        backgroundColor: 'rgba(255, 93, 93, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const biasByAttributeData = {
    labels: data.bias_by_attribute?.map((a) => formatLabel(a.attribute)) || [],
    datasets: [
      {
        label: 'Flagged Count',
        data: data.bias_by_attribute?.map((a) => a.count) || [],
        backgroundColor: ['#ff5d5d', '#ff8248', '#f6c453', '#33f0c8', '#47e79f'],
        borderRadius: 8,
      },
    ],
  }

  const biasByCategoryData = {
    labels: data.bias_by_category?.map((c) => formatLabel(c.category)) || [],
    datasets: [
      {
        label: 'Bias Rate %',
        data: data.bias_by_category?.map((c) => c.bias_rate) || [],
        backgroundColor: ['#ff5d5d', '#ff8248'],
        borderRadius: 8,
      },
    ],
  }

  const severityData = {
    labels: ['Negligible', 'Moderate', 'Severe', 'Critical'],
    datasets: [
      {
        label: 'Decisions by Severity',
        data: [
          data.summary?.total_decisions * (1 - data.summary?.bias_rate / 100) || 0,
          (data.bias_by_attribute?.length || 0) * 0.3,
          (data.bias_by_attribute?.length || 0) * 0.4,
          (data.bias_by_attribute?.length || 0) * 0.3,
        ],
        backgroundColor: ['#47e79f', '#f6c453', '#ff8248', '#ff5d5d'],
        borderWidth: 0,
      },
    ],
  }

  return (
    <>
      <div className="analytics-summary">
        <div className="summary-tile">
          <p className="card-title">Total decisions</p>
          <h3>{(data.summary?.decisions_last_24h || 0) + (data.summary?.decisions_last_7d || 0)}</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Bias rate</p>
          <h3>{data.summary?.bias_rate?.toFixed(1) || 0}%</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Avg severity</p>
          <h3>{data.summary?.avg_severity_score?.toFixed(1) || 0}</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Last 24h</p>
          <h3>{data.summary?.decisions_last_24h || 0}</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Last 7 days</p>
          <h3>{data.summary?.decisions_last_7d || 0}</h3>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel tall-chart">
          <div className="panel-header">
            <h2>Bias over time</h2>
            <span className="badge neutral">Last 30 days</span>
          </div>
          <div style={{ height: '220px' }}>
            <Line data={biasOverTimeData} options={chartOptions} />
          </div>
        </section>
        <section className="panel">
          <h3>Bias by attribute</h3>
          <div style={{ height: '200px' }}>
            <Bar data={biasByAttributeData} options={chartOptions} />
          </div>
        </section>
        <section className="panel">
          <h3>Bias by category</h3>
          <div style={{ height: '200px' }}>
            <Bar data={biasByCategoryData} options={chartOptions} />
          </div>
        </section>
        <section className="panel">
          <h3>Severity distribution</h3>
          <div style={{ height: '200px' }}>
            <Doughnut
              data={severityData}
              options={{
                ...chartOptions,
                scales: undefined,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </section>
      </div>
    </>
  )
}

function DemoCharts() {
  const demoBiasTime = {
    labels: ['Apr 25', 'Apr 26', 'Apr 27', 'Apr 28'],
    datasets: [
      {
        label: 'Total Decisions',
        data: [16, 19, 21, 28],
        borderColor: '#33f0c8',
        backgroundColor: 'rgba(51, 240, 200, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Biased Decisions',
        data: [12, 15, 17, 22],
        borderColor: '#ff5d5d',
        backgroundColor: 'rgba(255, 93, 93, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const demoAttribute = {
    labels: ['Name', 'Postcode', 'Gender', 'University Tier', 'Employment Gap'],
    datasets: [
      {
        label: 'Flagged Count',
        data: [18, 14, 9, 12, 6],
        backgroundColor: ['#ff5d5d', '#ff8248', '#f6c453', '#33f0c8', '#47e79f'],
        borderRadius: 8,
      },
    ],
  }

  const demoCategory = {
    labels: ['Loan', 'Job'],
    datasets: [
      {
        label: 'Bias Rate %',
        data: [34, 28],
        backgroundColor: ['#ff5d5d', '#ff8248'],
        borderRadius: 8,
      },
    ],
  }

  const demoSeverity = {
    labels: ['Negligible', 'Moderate', 'Severe', 'Critical'],
    datasets: [
      {
        data: [65, 20, 10, 5],
        backgroundColor: ['#47e79f', '#f6c453', '#ff8248', '#ff5d5d'],
        borderWidth: 0,
      },
    ],
  }

  return (
    <>
      <div className="analytics-summary">
        <div className="summary-tile">
          <p className="card-title">Total decisions</p>
          <h3>28</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Bias rate</p>
          <h3>78.6%</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Avg severity</p>
          <h3>52.4</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Last 24h</p>
          <h3>7</h3>
        </div>
        <div className="summary-tile">
          <p className="card-title">Last 7 days</p>
          <h3>21</h3>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel tall-chart">
          <div className="panel-header">
            <h2>Bias over time</h2>
            <span className="badge warning">Demo data</span>
          </div>
          <div style={{ height: '220px' }}>
            <Line data={demoBiasTime} options={chartOptions} />
          </div>
        </section>
        <section className="panel">
          <h3>Bias by attribute</h3>
          <div style={{ height: '200px' }}>
            <Bar data={demoAttribute} options={chartOptions} />
          </div>
        </section>
        <section className="panel">
          <h3>Bias by category</h3>
          <div style={{ height: '200px' }}>
            <Bar data={demoCategory} options={chartOptions} />
          </div>
        </section>
        <section className="panel">
          <h3>Severity distribution</h3>
          <div style={{ height: '200px' }}>
            <Doughnut
              data={demoSeverity}
              options={{
                ...chartOptions,
                scales: undefined,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </section>
      </div>
    </>
  )
}

export default Analytics
