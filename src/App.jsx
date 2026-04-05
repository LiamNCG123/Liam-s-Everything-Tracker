import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Goals from './pages/Goals'
import Training from './pages/Training'
import Education from './pages/Education'
import Finance from './pages/Finance'
import ImportCSV from './pages/ImportCSV'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/habits"         element={<Habits />} />
          <Route path="/goals"          element={<Goals />} />
          <Route path="/training"       element={<Training />} />
          <Route path="/education"      element={<Education />} />
          <Route path="/finance"        element={<Finance />} />
          <Route path="/finance/import" element={<ImportCSV />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
