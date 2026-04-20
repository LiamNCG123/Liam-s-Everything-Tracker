import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Today from './pages/Today'
import Habits from './pages/Habits'
import Goals from './pages/Goals'
import Training from './pages/Training'
import Education from './pages/Education'
import Finance from './pages/Finance'
import ImportCSV from './pages/ImportCSV'
import WeeklyReview from './pages/WeeklyReview'
import Settings from './pages/Settings'
import Onboarding from './components/Onboarding'
import { ModulesProvider } from './hooks/useModules'
import { load } from './utils/storage'

export default function App() {
  const [onboarded, setOnboarded] = useState(() => !!load('onboardingDone'))

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />
  }

  return (
    <ModulesProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"               element={<Today />} />
            <Route path="/habits"         element={<Habits />} />
            <Route path="/goals"          element={<Goals />} />
            <Route path="/training"       element={<Training />} />
            <Route path="/education"      element={<Education />} />
            <Route path="/finance"        element={<Finance />} />
            <Route path="/finance/import" element={<ImportCSV />} />
            <Route path="/review"         element={<WeeklyReview />} />
            <Route path="/settings"       element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ModulesProvider>
  )
}
