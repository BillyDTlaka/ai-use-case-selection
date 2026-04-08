import { Link, useLocation } from 'react-router-dom'
import { UserSelector } from './UserSelector'
import { useAppStore } from '../store/appStore'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/client-profile', label: 'Client Profile' },
  { path: '/use-cases/new', label: 'New Use Case' },
]

export function Layout({ children }) {
  const location = useLocation()
  const { currentUser } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-maroon-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-lg tracking-tight">AI Use Case Assessment</span>
            <nav className="flex gap-6">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition ${
                    location.pathname === item.path
                      ? 'text-white underline underline-offset-4'
                      : 'text-maroon-200 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-maroon-200">
            {currentUser ? (
              <UserSelector />
            ) : null}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
