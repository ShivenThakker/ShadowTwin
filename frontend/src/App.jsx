import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './components/shared/PublicLayout.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import Landing from './pages/Landing.jsx'
import Demo from './pages/Demo.jsx'
import Login from './pages/Login.jsx'
import Decisions from './pages/dashboard/Decisions.jsx'
import Analytics from './pages/dashboard/Analytics.jsx'
import Report from './pages/dashboard/Report.jsx'
import BatchAudit from './pages/dashboard/BatchAudit.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/login" element={<Login />} />
        </Route>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="decisions" replace />} />
          <Route path="decisions" element={<Decisions />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="batch-audit" element={<BatchAudit />} />
          <Route path="reports/:id" element={<Report />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
