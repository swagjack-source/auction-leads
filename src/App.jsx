import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Pipeline from './pages/Pipeline'
import DealScorer from './pages/DealScorer'
import CalendarView from './pages/CalendarView'
import History from './pages/History'
import { TeamProvider } from './lib/TeamContext'
import './index.css'

export default function App() {
  return (
    <TeamProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Pipeline />} />
              <Route path="/scorer" element={<DealScorer />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TeamProvider>
  )
}
