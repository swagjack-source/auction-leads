import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Columns3, FolderOpen, CalendarDays, LayoutGrid, BookUser, Users, BookOpen, Image, Clock, X, Search, FileText, MoreHorizontal, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import { useAuth } from '../../lib/AuthContext'

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10.5, color: 'var(--ink-4)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      fontWeight: 600, padding: '10px 10px 4px',
    }}>{children}</div>
  )
}

function NavItem({ to, icon: Icon, label, badge, mobile, onClose }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={mobile ? onClose : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--ink-1)' : 'var(--ink-2)',
        background: isActive ? 'var(--panel)' : 'transparent',
        boxShadow: isActive ? 'var(--shadow-1)' : 'none',
        transition: 'background 120ms',
      })}
      onMouseEnter={e => {
        const active = e.currentTarget.getAttribute('aria-current') === 'page'
        if (!active) e.currentTarget.style.background = 'var(--hover)'
      }}
      onMouseLeave={e => {
        const active = e.currentTarget.getAttribute('aria-current') === 'page'
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? 'var(--accent)' : 'var(--ink-3)', display: 'inline-flex' }}>
            <Icon size={16} strokeWidth={isActive ? 2 : 1.7} />
          </span>
          <span style={{ flex: 1 }}>{label}</span>
          {badge != null && badge !== 0 && (
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              color: isActive ? 'var(--accent-ink)' : 'var(--ink-3)',
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              padding: '1px 6px', borderRadius: 999,
            }}>{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ mobile, onClose }) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [pipelineCount, setPipelineCount] = useState(null)
  const [calendarCount, setCalendarCount] = useState(null)

  useEffect(() => {
    supabase.from('leads').select('id', { count: 'exact', head: true })
      .in('status', ['New Lead', 'Contacted', 'In Talks', 'Consult Scheduled', 'Consult Completed', 'Project Scheduled'])
      .then(({ count }) => setPipelineCount(count || null))

    const now = new Date().toISOString()
    supabase.from('meetings').select('id', { count: 'exact', head: true })
      .gte('date', now.split('T')[0])
      .then(({ count }) => setCalendarCount(count || null))
      .catch(() => setCalendarCount(null))
  }, [])

  const mainNav = [
    { to: '/home',      icon: Home,         label: 'Home'           },
    { to: '/',          icon: Columns3,     label: 'Pipeline',      badge: pipelineCount },
    { to: '/projects',  icon: FolderOpen,   label: 'Projects'       },
    { to: '/calendar',  icon: CalendarDays, label: 'Calendar',      badge: calendarCount },
    { to: '/schedule',  icon: LayoutGrid,   label: 'Schedule'       },
    { to: '/contacts',  icon: BookUser,     label: 'Contacts'       },
    { to: '/employees', icon: Users,        label: 'Employees'      },
    { to: '/training',  icon: BookOpen,     label: 'Training'       },
    { to: '/library',   icon: Image,        label: 'Library'        },
    { to: '/history',   icon: Clock,        label: 'Past Projects'  },
  ]

  const quickLinks = [
    { to: '/templates', icon: FileText, label: 'Templates' },
  ]

  return (
    <aside style={{
      width: 232,
      height: '100%',
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--line)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      padding: '14px 10px 10px',
      ...(mobile ? {
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 200,
        boxShadow: 'var(--shadow-lg)',
      } : {}),
    }}>

      {/* Workspace header — CT logo */}
      <div style={{
        padding: '4px 6px 12px',
        borderBottom: '1px solid var(--line-2)',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <img
          src={theme === 'dark' ? '/homebase-logo-white.svg' : '/homebase-logo-black.svg'}
          alt="Homebase"
          style={{ flex: 1, minWidth: 0, maxWidth: '100%', height: 'auto', display: 'block' }}
        />
        {mobile && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, borderRadius: 6, display: 'flex', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 9, padding: '7px 10px', marginBottom: 6,
      }}>
        <Search size={13} color="var(--ink-4)" strokeWidth={1.8} />
        <input
          placeholder="Search"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 12.5, color: 'var(--ink-1)', fontFamily: 'inherit',
          }}
        />
        <span className="mono" style={{
          fontSize: 10, color: 'var(--ink-4)',
          border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 4,
        }}>⌘K</span>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', marginTop: 2 }}>
        <SectionLabel>Workspace</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {mainNav.map(item => (
            <NavItem key={item.to} {...item} mobile={mobile} onClose={onClose} />
          ))}
        </div>

        <SectionLabel>Quick links</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {quickLinks.map(item => (
            <NavItem key={item.to} {...item} mobile={mobile} onClose={onClose} />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div style={{
        marginTop: 12,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px',
        borderRadius: 10,
        border: '1px solid var(--line)',
        background: 'var(--panel)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #A50050, #7A003A)',
          color: 'white', display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 11, flexShrink: 0,
        }}>
          {user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.2 }}>Signed in</div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          title="Sign out"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <LogOut size={15} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  )
}
