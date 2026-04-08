import { useState } from 'react'
import { useAppStore } from '../store/appStore'

const ROLES = ['Creator', 'Reviewer', 'Approver']

export function UserSelector() {
  const { currentUser, setCurrentUser } = useAppStore()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [role, setRole] = useState(currentUser?.role ?? 'Creator')
  const [open, setOpen] = useState(!currentUser)

  if (!open && currentUser) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-maroon-900 hover:underline"
      >
        {currentUser.name} ({currentUser.role})
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-maroon-900 mb-6">Who are you?</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah Jones"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-900"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button
            disabled={!name.trim()}
            onClick={() => { setCurrentUser({ name: name.trim(), role }); setOpen(false) }}
            className="w-full bg-maroon-900 text-white py-2 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-maroon-800 transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
