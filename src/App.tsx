import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { flushOutbox } from './lib/offline'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Home from './pages/Home'
import History from './pages/History'
import Exercises from './pages/Exercises'
import Settings from './pages/Settings'

/** Essaie de rejouer les actions enregistrées hors-ligne : au chargement, à la reconnexion, puis toutes les 20s. */
function useOfflineSync() {
  useEffect(() => {
    flushOutbox()
    window.addEventListener('online', flushOutbox)
    const id = setInterval(flushOutbox, 20000)
    return () => {
      window.removeEventListener('online', flushOutbox)
      clearInterval(id)
    }
  }, [])
}

function AppShell() {
  const { session, loading } = useAuth()
  useOfflineSync()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-slate-500">Chargement…</div>
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
