import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Goals from './pages/Goals'
import Training from './pages/Training'
import Education from './pages/Education'
import Business from './pages/Business'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/habits"    element={<Habits />} />
          <Route path="/goals"     element={<Goals />} />
          <Route path="/training"  element={<Training />} />
          <Route path="/education" element={<Education />} />
          <Route path="/business"  element={<Business />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
