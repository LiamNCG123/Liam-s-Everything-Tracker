import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import AuthLayout from '../components/AuthLayout'
import { Button, Input } from '../components/ui'

function FieldError({ message }) {
  if (!message) return null
  return <span className="text-xs text-red-500 mt-0.5">{message}</span>
}

function ServerError({ message }) {
  if (!message) return null
  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm">
      {message}
    </div>
  )
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const errs = {}
    if (!email.includes('@')) errs.email = 'Enter a valid email address'
    if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (confirm !== password) errs.confirm = 'Passwords do not match'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setServerError('')
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (error) {
      setServerError(error.message)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-lg font-semibold text-theme-primary mb-2">Check your email</h2>
          <p className="text-sm text-theme-muted mb-5">
            We sent a confirmation link to{' '}
            <strong className="text-theme-secondary">{email}</strong>. Click it to activate your account.
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
      <h2 className="text-xl font-semibold text-theme-primary mb-5">Create account</h2>

      <ServerError message={serverError} />

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
          <FieldError message={errors.email} />
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <FieldError message={errors.password} />
        </div>

        <div className="flex flex-col gap-1">
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <FieldError message={errors.confirm} />
        </div>

        <Button type="submit" disabled={loading} className="w-full justify-center mt-1">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-theme-muted text-center mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
