import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateUseCase } from '../api/queries'
import { useAppStore } from '../store/appStore'

const BUSINESS_UNITS = ['Claims', 'Underwriting', 'Finance', 'Operations', 'HR', 'IT', 'CX']
const DOMAINS = ['Fraud', 'Claims', 'CX', 'Operations', 'Underwriting', 'Finance', 'HR', 'Other']
const WORKSPACES = ['Innovation', 'Core Systems', 'Digital', 'Analytics', 'Infrastructure']

export function NewUseCasePage() {
  const navigate = useNavigate()
  const { mutateAsync: create, isPending } = useCreateUseCase()
  const { currentUser, activeClientId } = useAppStore()
  const [form, setForm] = useState({
    title: '', description: '', businessObjective: '',
    businessUnit: BUSINESS_UNITS[0], domain: DOMAINS[0], workspace: WORKSPACES[0], owner: '',
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activeClientId) { alert('Please select a Client Profile first.'); return }
    const uc = await create({ ...form, createdBy: currentUser?.name ?? 'Unknown', clientProfileId: activeClientId })
    navigate(`/use-cases/${uc.id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Use Case</h1>
      {!activeClientId && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          No client profile selected. <a href="/client-profile" className="underline font-medium">Set one up first.</a>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. AI-Powered Claims Triage" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea required rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900 resize-none" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the use case in detail…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Objective *</label>
          <textarea required rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900 resize-none" value={form.businessObjective} onChange={e => set('businessObjective', e.target.value)} placeholder="What business outcome does this achieve?" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Business Unit', key: 'businessUnit', options: BUSINESS_UNITS },
            { label: 'Domain', key: 'domain', options: DOMAINS },
            { label: 'Workspace', key: 'workspace', options: WORKSPACES },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900" value={form[f.key]} onChange={e => set(f.key, e.target.value)}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner *</label>
          <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="e.g. Sarah Jones" />
        </div>
        <button type="submit" disabled={isPending || !activeClientId} className="bg-maroon-900 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-maroon-800 disabled:opacity-50 transition">
          {isPending ? 'Creating…' : 'Create Use Case'}
        </button>
      </form>
    </div>
  )
}
