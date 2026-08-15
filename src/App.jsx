import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { LogsPage } from './pages/LogsPage'
import { PlannerPage } from './pages/PlannerPage'
import { ProgressPage } from './pages/ProgressPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/planner" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
