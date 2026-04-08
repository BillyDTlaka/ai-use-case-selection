import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { UserSelector } from './components/UserSelector'
import { Dashboard } from './pages/Dashboard'
import { ClientProfilePage } from './pages/ClientProfilePage'
import { NewUseCasePage } from './pages/NewUseCasePage'
import { UseCaseDetailPage } from './pages/UseCaseDetailPage'
import { useAppStore } from './store/appStore'

export default function App() {
  const { currentUser } = useAppStore()

  return (
    <>
      {!currentUser && <UserSelector />}
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/client-profile" element={<ClientProfilePage />} />
          <Route path="/use-cases/new" element={<NewUseCasePage />} />
          <Route path="/use-cases/:id" element={<UseCaseDetailPage />} />
        </Routes>
      </Layout>
    </>
  )
}
