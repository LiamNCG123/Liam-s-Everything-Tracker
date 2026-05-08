import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import AuthLayout from '../components/AuthLayout'
import { Button, Input } from '../components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-lg font-semibold text-theme-primary mb-2">Email sent</h2>
          <p className="text-sm text-theme-muted mb-5">
            Check your inbox at{' '}
            <strong className="text-theme-secondary">{email}</strong> for a reset link.
          </p>
          <Link to="/login" className="text-sm text-brand-500 hover:text-brand-600 font-medium">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-theme-primary mb-2">Reset password</h2>
      <p className="text-sm text-theme-muted mb-5">
        We'll send a reset link to your email.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Sending…' : 'Send reset email'}
        </Button>
      </form>

      <p className="text-sm text-theme-muted text-center mt-5">
        <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
