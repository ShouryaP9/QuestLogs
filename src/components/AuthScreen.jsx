import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabaseClient'

export function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!supabaseConfigured) return
    setLoading(true)
    setStatus(null)
    const action = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email: email.trim(), password })
      : supabase.auth.signUp({ email: email.trim(), password })
    const { error } = await action
    setLoading(false)
    if (error) { setStatus({ type: 'error', text: error.message }); return }
    if (mode === 'signup') setStatus({ type: 'success', text: 'Check your email to confirm your account, then sign in.' })
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-base-200 px-4 text-base-content">
      <form onSubmit={submit} className="parchment-surface modal-box w-full max-w-sm">
        <h1 className="text-xl font-bold"><span className="brand-quest">Quest</span><span className="theme-accent">Logs</span></h1>
        <p className="mt-1 text-sm opacity-70">{mode === 'signin' ? 'Sign in to sync your quests across devices.' : 'Create an account to get started.'}</p>

        {!supabaseConfigured && <p className="mt-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">Supabase isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example) and restart the app.</p>}

        <label className="form-control mt-5"><span className="label-text mb-2 font-semibold">Email</span><input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className="parchment-field input input-bordered w-full" placeholder="you@example.com" /></label>
        <label className="form-control mt-4"><span className="label-text mb-2 font-semibold">Password</span><input type="password" required minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} className="parchment-field input input-bordered w-full" placeholder="At least 6 characters" /></label>

        {status && <p className={`mt-4 text-sm ${status.type === 'error' ? 'text-error' : 'text-success'}`}>{status.text}</p>}

        <button type="submit" disabled={loading || !supabaseConfigured} className="btn parchment-button mt-6 w-full">{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>

        <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setStatus(null) }} className="parchment-muted mt-4 w-full text-sm underline">
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
