import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs = {}
    if (!email.includes('@')) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    setServerError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setServerError(error.message)
    } else {
      navigate('/')
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-theme-primary mb-5">Sign in</h2>

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
            autoComplete="current-password"
          />
          <FieldError message={errors.password} />
          <Link
            to="/forgot-password"
            className="text-xs text-brand-500 hover:text-brand-600 self-end mt-0.5"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full justify-center mt-1">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-sm text-theme-muted text-center mt-5">
        Don't have an account?{' '}
        <Link to="/signup" className="text-brand-500 hover:text-brand-600 font-medium">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
