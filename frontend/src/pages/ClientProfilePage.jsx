import { useState } from 'react'
import { useClientProfiles, useCreateClientProfile } from '../api/queries'
import { useAppStore } from '../store/appStore'

const CLOUD_ENVS = ['AWS', 'Azure', 'GCP', 'Hybrid', 'On-Premise']
const DATA_QUALITIES = ['High', 'Medium', 'Low']

function TagInput({ label, value, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !value.includes(v)) { onChange([...value, v]); setInput('') }
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2 flex-wrap">
        {value.map(tag => (
          <span key={tag} className="bg-maroon-100 text-maroon-900 px-2 py-0.5 rounded text-xs flex items-center gap-1">
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-red-600">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-maroon-900"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <button onClick={add} className="bg-gray-100 px-3 rounded-lg text-sm hover:bg-gray-200">Add</button>
      </div>
    </div>
  )
}

const EMPTY = { name: '', systems: [], integrations: [], dataPlatforms: [], channels: [], cloudEnv: 'AWS', dataQuality: 'High', constraints: [] }

export function ClientProfilePage() {
  const { data: profiles = [] } = useClientProfiles()
  const { mutateAsync: create, isPending } = useCreateClientProfile()
  const { setActiveClientId, activeClientId } = useAppStore()
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const profile = await create(form)
    setActiveClientId(profile.id)
    setForm(EMPTY)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Client Profile</h1>

      {profiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Existing Profiles</h2>
          <div className="space-y-2">
            {profiles.map(p => (
              <div
                key={p.id}
                onClick={() => setActiveClientId(p.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition ${activeClientId === p.id ? 'border-maroon-900 bg-maroon-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs text-gray-500">{p.cloudEnv} · {p.dataQuality} data quality</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-6">New Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Acme Insurance" />
          </div>
          <TagInput label="Core Systems" value={form.systems} onChange={v => set('systems', v)} placeholder="SAP, CRM, Core Insurance…" />
          <TagInput label="Integration Layer" value={form.integrations} onChange={v => set('integrations', v)} placeholder="REST APIs, ESB, MuleSoft…" />
          <TagInput label="Data Platforms" value={form.dataPlatforms} onChange={v => set('dataPlatforms', v)} placeholder="Data Lake, Fabric, Snowflake…" />
          <TagInput label="Channels" value={form.channels} onChange={v => set('channels', v)} placeholder="Web, Mobile, WhatsApp…" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cloud Environment</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900" value={form.cloudEnv} onChange={e => set('cloudEnv', e.target.value)}>
                {CLOUD_ENVS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Quality</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900" value={form.dataQuality} onChange={e => set('dataQuality', e.target.value)}>
                {DATA_QUALITIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <TagInput label="Constraints" value={form.constraints} onChange={v => set('constraints', v)} placeholder="POPIA, legacy systems…" />
          <div className="flex items-center gap-4">
            <button type="submit" disabled={isPending} className="bg-maroon-900 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-maroon-800 disabled:opacity-50 transition">
              {isPending ? 'Saving…' : 'Save Profile'}
            </button>
            {saved && <span className="text-green-600 text-sm">Profile saved and set as active.</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
