import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, Moon, Sun, HelpCircle } from 'lucide-react'
import Tour from './components/Tour'
import { useTheme } from './lib/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import PrivateRoute from './components/PrivateRoute'
import Sidebar from './components/Layout/Sidebar'

// Route-based code splitting — each page loads only when first visited.
const Home         = lazy(() => import('./pages/Home'))
const Pipeline     = lazy(() => import('./pages/Pipeline'))
const DealScorer   = lazy(() => import('./pages/DealScorer'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const Contacts     = lazy(() => import('./pages/Contacts'))
const Projects     = lazy(() => import('./pages/Projects'))
const BDR          = lazy(() => import('./pages/BDR'))
const Training     = lazy(() => import('./pages/Training'))
const Library      = lazy(() => import('./pages/Library'))
const Activity     = lazy(() => import('./pages/Activity'))
const Templates    = lazy(() => import('./pages/Templates'))
const Expenses     = lazy(() => import('./pages/Expenses'))
const Inventory    = lazy(() => import('./pages/Inventory'))
const CTBids       = lazy(() => import('./pages/CTBids'))
const SavedViews   = lazy(() => import('./pages/SavedViews'))
const CrewSchedule = lazy(() => import('./pages/CrewSchedule'))
const TeamSettings = lazy(() => import('./pages/TeamSettings'))
const Login        = lazy(() => import('./pages/Login'))
import { TeamProvider } from './lib/TeamContext'
import { ThemeProvider } from './lib/ThemeContext'
import { AuthProvider } from './lib/AuthContext'
import { useIsMobile } from './hooks/useIsMobile'
import './index.css'

const PAGE_TITLES = {
  '/':           'Home',
  '/pipeline':   'Pipeline',
  '/projects':   'Projects',
  '/scorer':     'Deal Scorer',
  '/calendar':   'Calendar',
  '/bdr':        'BDR',
  '/contacts':   'Contacts',
  '/training':   'Training',
  '/library':    'Library',
  '/activity':   'Activity',
  '/templates':  'Templates',
  '/expenses':   'Expenses',
  '/inventory':  'Inventory',
  '/ctbids':     'CTBids Analytics',
  '/saved':      'Saved Views',
  '/schedule':   'Crew Schedule',
  '/team':       'Team & Access',
}

function Topbar({ onMenuClick, isMobile, onStartTour }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const title = PAGE_TITLES[location.pathname] || 'Workspace'
  const isPipeline = location.pathname === '/pipeline'
  const isProjects = location.pathname.startsWith('/projects')

  return (
    <header style={{
      height: 54,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 20px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--topbar-bg)',
      backdropFilter: 'saturate(180%) blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {isMobile && (
        <button
          onClick={onMenuClick}
          style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', borderRadius: 8 }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: 'var(--ink-3)' }}>Workspace</span>
        <span style={{ color: 'var(--ink-4)', fontSize: 15, lineHeight: 1 }}>/</span>
        <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{title}</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Icons */}
      <button
        style={iconBtn}
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark'
          ? <Sun size={16} strokeWidth={1.7} />
          : <Moon size={16} strokeWidth={1.7} />}
      </button>
      <button style={iconBtn} title="Notifications">
        <Bell size={16} strokeWidth={1.7} />
        <span style={{
          position: 'absolute', top: 7, right: 7,
          width: 6, height: 6, borderRadius: '50%',
          background: '#C84A4A', border: '1.5px solid var(--bg)',
        }} />
      </button>
      <button onClick={onStartTour} style={iconBtn} title="Take a tour">
        <HelpCircle size={16} strokeWidth={1.7} />
      </button>

      <div style={{ width: 1, height: 22, background: 'var(--line)' }} />

      {isPipeline && (
        <button
          onClick={() => {/* handled inside Pipeline */}}
          id="global-new-lead"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 13px 7px 10px', borderRadius: 10,
            background: 'var(--accent)', color: 'white',
            border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 12.5, letterSpacing: '-0.005em',
            boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(43,68,104,0.3)',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#34507A'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          New Lead
        </button>
      )}
      {isProjects && (
        <button
          id="global-new-project"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 13px 7px 10px', borderRadius: 10,
            background: 'var(--accent)', color: 'white',
            border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 12.5, letterSpacing: '-0.005em',
            boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(43,68,104,0.3)',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#34507A'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--accent)'}
          onClick={() => document.getElementById('projects-new-btn')?.click()}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          New Project
        </button>
      )}
    </header>
  )
}

const iconBtn = {
  width: 32, height: 32, borderRadius: 10, border: 'none',
  background: 'transparent', cursor: 'pointer',
  display: 'grid', placeItems: 'center',
  color: 'var(--ink-2)', position: 'relative',
}

function AppLayout() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tourActive, setTourActive] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {!isMobile && (
        <ErrorBoundary inline>
          <Sidebar />
        </ErrorBoundary>
      )}

      {isMobile && sidebarOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'var(--overlay-heavy)', zIndex: 199 }}
            onClick={() => setSidebarOpen(false)}
          />
          <ErrorBoundary inline>
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </ErrorBoundary>
        </>
      )}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} isMobile={isMobile} onStartTour={() => setTourActive(true)} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Loading…
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {tourActive && <Tour onClose={() => setTourActive(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TeamProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  <Route path="/login" element={<Suspense fallback={null}><Login /></Suspense>} />
                  <Route element={<AppLayout />}>
                    <Route path="/"          element={<PrivateRoute><Home /></PrivateRoute>} />
                    <Route path="/pipeline"  element={<PrivateRoute><Pipeline /></PrivateRoute>} />
                    {/* Legacy /scorer route — Deal Scorer now opens from Projects */}
                    <Route path="/scorer"    element={<Navigate to="/projects?openScorer=true" replace />} />
                    <Route path="/calendar"  element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
                    <Route path="/bdr"       element={<PrivateRoute><BDR /></PrivateRoute>} />
                    <Route path="/contacts"  element={<PrivateRoute><Contacts /></PrivateRoute>} />
                    <Route path="/projects"  element={<PrivateRoute><Projects /></PrivateRoute>} />
                    <Route path="/training"  element={<PrivateRoute><Training /></PrivateRoute>} />
                    <Route path="/library"   element={<PrivateRoute><Library /></PrivateRoute>} />
                    <Route path="/activity"  element={<PrivateRoute><Activity /></PrivateRoute>} />
                    {/* /templates is now a tab inside /library */}
                    <Route path="/templates" element={<Navigate to="/library?tab=templates" replace />} />
                    <Route path="/expenses"  element={<PrivateRoute><Expenses /></PrivateRoute>} />
                    <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
                    <Route path="/ctbids"    element={<PrivateRoute><CTBids /></PrivateRoute>} />
                    <Route path="/saved"     element={<PrivateRoute><SavedViews /></PrivateRoute>} />
                    <Route path="/schedule" element={<PrivateRoute><CrewSchedule /></PrivateRoute>} />
                    <Route path="/team"     element={<PrivateRoute><TeamSettings /></PrivateRoute>} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </TeamProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
