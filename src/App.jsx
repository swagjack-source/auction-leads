import { useState } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, Moon, Sun, Sparkles } from 'lucide-react'
import { useTheme } from './lib/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import PrivateRoute from './components/PrivateRoute'
import Sidebar from './components/Layout/Sidebar'
import Home from './pages/Home'
import Pipeline from './pages/Pipeline'
import DealScorer from './pages/DealScorer'
import CalendarView from './pages/CalendarView'
import Contacts from './pages/Contacts'
import Schedule from './pages/Schedule'
import History from './pages/History'
import Projects from './pages/Projects'
import Employees from './pages/Employees'
import Training from './pages/Training'
import Library from './pages/Library'
import Inbox from './pages/Inbox'
import Templates from './pages/Templates'
import Expenses from './pages/Expenses'
import Inventory from './pages/Inventory'
import CTBids from './pages/CTBids'
import SavedViews from './pages/SavedViews'
import Login from './pages/Login'
import { TeamProvider } from './lib/TeamContext'
import { ThemeProvider } from './lib/ThemeContext'
import { AuthProvider } from './lib/AuthContext'
import { useIsMobile } from './hooks/useIsMobile'
import './index.css'

const PAGE_TITLES = {
  '/home':       'Home',
  '/':           'Pipeline',
  '/projects':   'Projects',
  '/scorer':     'Deal Scorer',
  '/calendar':   'Consult Calendar',
  '/contacts':   'Contacts',
  '/schedule':   'Project Schedule',
  '/history':    'Past Projects',
  '/employees':  'Employees',
  '/training':   'Training',
  '/library':    'Library',
  '/inbox':      'Inbox',
  '/templates':  'Templates',
  '/expenses':   'Expenses',
  '/inventory':  'Inventory',
  '/ctbids':     'CTBids Analytics',
  '/saved':      'Saved Views',
}

function Topbar({ onMenuClick, isMobile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const title = PAGE_TITLES[location.pathname] || 'Workspace'
  const isPipeline = location.pathname === '/'
  const isProjects = location.pathname === '/projects'

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
      <button style={iconBtn} title="AI assistant"><Sparkles size={16} strokeWidth={1.7} /></button>

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {!isMobile && <Sidebar />}

      {isMobile && sidebarOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'var(--overlay-heavy)', zIndex: 199 }}
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar mobile onClose={() => setSidebarOpen(false)} />
        </>
      )}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} isMobile={isMobile} />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Outlet />
        </main>
      </div>
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
                  <Route path="/login" element={<Login />} />
                  <Route element={<AppLayout />}>
                    <Route path="/home"      element={<PrivateRoute><Home /></PrivateRoute>} />
                  <Route path="/"          element={<PrivateRoute><Pipeline /></PrivateRoute>} />
                    <Route path="/scorer"    element={<PrivateRoute><DealScorer /></PrivateRoute>} />
                    <Route path="/calendar"  element={<PrivateRoute><CalendarView /></PrivateRoute>} />
                    <Route path="/contacts"  element={<PrivateRoute><Contacts /></PrivateRoute>} />
                    <Route path="/schedule"  element={<PrivateRoute><Schedule /></PrivateRoute>} />
                    <Route path="/projects"  element={<PrivateRoute><Projects /></PrivateRoute>} />
                    <Route path="/history"   element={<PrivateRoute><History /></PrivateRoute>} />
                    <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
                    <Route path="/training"  element={<PrivateRoute><Training /></PrivateRoute>} />
                    <Route path="/library"   element={<PrivateRoute><Library /></PrivateRoute>} />
                    <Route path="/inbox"     element={<PrivateRoute><Inbox /></PrivateRoute>} />
                    <Route path="/templates" element={<PrivateRoute><Templates /></PrivateRoute>} />
                    <Route path="/expenses"  element={<PrivateRoute><Expenses /></PrivateRoute>} />
                    <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
                    <Route path="/ctbids"    element={<PrivateRoute><CTBids /></PrivateRoute>} />
                    <Route path="/saved"     element={<PrivateRoute><SavedViews /></PrivateRoute>} />
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
