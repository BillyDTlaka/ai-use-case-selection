import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUseCases } from '../api/queries'
import { ScoreCell } from '../components/ScoreCell'
import { StatusBadge } from '../components/StatusBadge'
import { RecommendationBadge } from '../components/RecommendationBadge'

const BUSINESS_UNITS = ['All', 'Claims', 'Underwriting', 'Finance', 'Operations', 'HR', 'IT', 'CX']
const DOMAINS = ['All', 'Fraud', 'Claims', 'CX', 'Operations', 'Underwriting', 'Finance', 'HR', 'Other']
const STATUSES = ['All', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED']
const RECOMMENDATIONS = ['All', 'QUICK_WIN', 'STRATEGIC', 'AVOID']

export function Dashboard() {
  const [filters, setFilters] = useState({})
  const { data: useCases = [], isLoading } = useUseCases(filters)

  const total = useCases.length
  const quickWins = useCases.filter(u => u.recommendation === 'QUICK_WIN').length
  const strategic = useCases.filter(u => u.recommendation === 'STRATEGIC').length
  const avoid = useCases.filter(u => u.recommendation === 'AVOID').length

  const setFilter = (key, val) =>
    setFilters(prev => ({ ...prev, [key]: val === 'All' ? undefined : val }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Use Cases', value: total, color: 'bg-gray-800' },
          { label: 'Quick Wins', value: quickWins, color: 'bg-green-700' },
          { label: 'Strategic', value: strategic, color: 'bg-blue-700' },
          { label: 'Avoid', value: avoid, color: 'bg-red-700' },
        ].map(card => (
          <div key={card.label} className={`${card.color} text-white rounded-xl p-5 shadow`}>
            <div className="text-3xl font-bold">{card.value}</div>
            <div className="text-sm mt-1 opacity-80">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4">
        {[
          { label: 'Business Unit', key: 'businessUnit', options: BUSINESS_UNITS },
          { label: 'Domain', key: 'domain', options: DOMAINS },
          { label: 'Status', key: 'status', options: STATUSES },
          { label: 'Recommendation', key: 'recommendation', options: RECOMMENDATIONS },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900"
              onChange={e => setFilter(f.key, e.target.value)}
            >
              {f.options.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : useCases.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No use cases yet.{' '}
            <Link to="/use-cases/new" className="text-maroon-900 underline">Create one</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Use Case', 'Business Unit', 'Domain', 'Workspace', 'Owner', 'Value', 'Feasibility', 'Data', 'Speed', 'Risk', 'Total', 'Recommendation', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {useCases.map(uc => (
                  <tr key={uc.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/use-cases/${uc.id}`} className="text-maroon-900 hover:underline">{uc.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{uc.businessUnit}</td>
                    <td className="px-4 py-3 text-gray-600">{uc.domain}</td>
                    <td className="px-4 py-3 text-gray-600">{uc.workspace}</td>
                    <td className="px-4 py-3 text-gray-600">{uc.owner}</td>
                    <td className="px-4 py-3"><ScoreCell value={uc.scoreValue} /></td>
                    <td className="px-4 py-3"><ScoreCell value={uc.scoreFeasibility} /></td>
                    <td className="px-4 py-3"><ScoreCell value={uc.scoreData} /></td>
                    <td className="px-4 py-3"><ScoreCell value={uc.scoreSpeed} /></td>
                    <td className="px-4 py-3"><ScoreCell value={uc.scoreRisk} /></td>
                    <td className="px-4 py-3 font-bold text-gray-800">{uc.totalScore ?? '—'}</td>
                    <td className="px-4 py-3"><RecommendationBadge value={uc.recommendation} /></td>
                    <td className="px-4 py-3"><StatusBadge status={uc.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
