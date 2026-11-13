import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center text-slate-200">
        <p className="text-lg font-semibold">Supabase non configuré</p>
        <p className="max-w-sm text-sm text-slate-400">
          Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans un fichier .env.local à la
          racine du projet, puis relance le serveur de dev.
        </p>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setInfo('Compte créé. Vérifie ta boîte mail si une confirmation est requise.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-white">🏋️ Muscu Tracker</h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          {mode === 'signin' ? 'Connecte-toi' : 'Crée ton compte'}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            required
            placeholder="mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {mode === 'signin' ? 'Connexion' : 'Créer le compte'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 w-full text-center text-sm text-slate-400 underline"
        >
          {mode === 'signin' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}
