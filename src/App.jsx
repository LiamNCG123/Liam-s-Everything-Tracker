import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ModulesProvider } from './hooks/useModules'
import { load, save } from './utils/storage'
import { supabase } from './lib/supabase/client'
import { useLocalMigration } from './hooks/useLocalMigration'
import Today from './pages/Today'
import Habits from './pages/Habits'
import Goals from './pages/Goals'
import Training from './pages/Training'
import Education from './pages/Education'
import Finance from './pages/Finance'
import ImportCSV from './pages/ImportCSV'
import Review from './pages/Review'
import Settings from './pages/Settings'
import Account from './pages/Account'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Onboarding from './components/Onboarding'

// The main app shell: handles the onboarding gate then renders the full Layout
function MainShell() {
  const { user, profile, loading, profileLoading } = useAuth()
  useLocalMigration()
  const [onboarded, setOnboarded] = useState(() => !!load('onboardingDone'))

  // Bidirectional onboarding sync once profile has loaded
  useEffect(() => {
    if (profileLoading || !profile || !user) return
    if (profile.onboarding_done && !onboarded) {
      // Supabase says done → mark this device
      save('onboardingDone', true)
      setOnboarded(true)
    } else if (onboarded && !profile.onboarding_done) {
      // This device says done → tell Supabase (covers existing users who never triggered the callback)
      supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    }
  }, [profileLoading, profile, onboarded, user])

  const handleOnboardingComplete = useCallback(async () => {
    setOnboarded(true)
    if (user) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    }
  }, [user])

  // Wait for profile to load before deciding whether to show onboarding
  if (!onboarded && (loading || profileLoading)) {
    return null
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"               element={<Today />} />
        <Route path="/habits"         element={<Habits />} />
        <Route path="/goals"          element={<Goals />} />
        <Route path="/training"       element={<Training />} />
        <Route path="/education"      element={<Education />} />
        <Route path="/finance"        element={<Finance />} />
        <Route path="/finance/import" element={<ImportCSV />} />
        <Route path="/review"         element={<Review />} />
        <Route path="/monthly"        element={<Navigate to="/review?period=month" replace />} />
        <Route path="/settings"       element={<Settings />} />
        <Route path="/account"        element={<ProtectedRoute><Account /></ProtectedRoute>} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ModulesProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth pages — standalone, no Layout, no onboarding gate */}
            <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup"          element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Everything else — requires login */}
            <Route path="/*" element={<ProtectedRoute><MainShell /></ProtectedRoute>} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </ModulesProvider>
    </AuthProvider>
  )
}
