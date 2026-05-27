import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../context/AuthContext'
import { Button, Input, PageHeader, Card } from '../components/ui'
import { save } from '../utils/storage'

function StatusMessage({ status }) {
  if (!status) return null
  const isSuccess = status.type === 'success'
  return (
    <div className={`px-4 py-3 rounded-xl text-sm ${
      isSuccess
        ? 'bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
        : 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
    }`}>
      {status.message}
    </div>
  )
}

export default function Account() {
  const { user, refreshProfile } = useAuth()
  const fileRef = useRef(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? '')
          setAvatarUrl(data.avatar_url ?? '')
        }
        setProfileLoading(false)
      })
  }, [user])

  // Detect when user arrives via a password-reset email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        setShowPasswordForm(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(false)
    if (!error) save('userName', displayName)
    setStatus(error
      ? { type: 'error', message: error.message }
      : { type: 'success', message: 'Profile saved.' }
    )
    if (!error) refreshProfile()
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image must be under 2 MB.' })
      return
    }

    setUploading(true)
    setStatus(null)

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setStatus({ type: 'error', message: uploadError.message })
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const newAvatarUrl = data.publicUrl

    await supabase
      .from('profiles')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', user.id)

    setAvatarUrl(newAvatarUrl)
    setUploading(false)
    setStatus({ type: 'success', message: 'Avatar updated.' })
    refreshProfile()
    // reset file input so the same file can be re-selected
    e.target.value = ''
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPasswordStatus(null)
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    setPasswordChanging(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordChanging(false)
    if (error) {
      setPasswordStatus({ type: 'error', message: error.message })
    } else {
      setPasswordStatus({ type: 'success', message: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      setPasswordRecovery(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const initials = (displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">
      <PageHeader title="Account" />

      <Card className="p-6 flex flex-col gap-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-theme-input overflow-hidden shrink-0 border border-theme-subtle">
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full flex items-center justify-center text-theme-secondary text-xl font-bold">
                  {initials}
                </div>
              )
            }
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
            <p className="text-xs text-theme-muted mt-0.5">JPG, PNG or GIF · max 2 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Display name */}
        <Input
          label="Display name"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />

        {/* Email — read-only */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-theme-secondary">Email</span>
          <div className="border border-theme rounded-xl px-3 py-2 text-sm text-theme-muted bg-theme-input select-all">
            {user?.email}
          </div>
        </div>

        <StatusMessage status={status} />

        <div className="flex items-center justify-between">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="ghost" onClick={handleSignOut} className="text-theme-muted">
            Sign out
          </Button>
        </div>
      </Card>

      {/* Password section */}
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-theme-primary">Password</h3>
            {passwordRecovery && (
              <p className="text-xs text-brand-500 mt-0.5">Set a new password for your account.</p>
            )}
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => { setShowPasswordForm(true); setPasswordStatus(null) }}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors"
            >
              Change password
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4" noValidate>
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat new password"
            />
            <StatusMessage status={passwordStatus} />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={passwordChanging}>
                {passwordChanging ? 'Updating…' : 'Update password'}
              </Button>
              {!passwordRecovery && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPasswordStatus(null) }}
                  className="text-theme-muted"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
