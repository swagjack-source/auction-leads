import { NavLink } from 'react-router-dom'
import { Columns3, Calculator, TrendingUp, Clock, CalendarDays } from 'lucide-react'

const navItems = [
  { to: '/',         icon: Columns3,     label: 'Pipeline'      },
  { to: '/scorer',   icon: Calculator,   label: 'Deal Scorer'   },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar'      },
  { to: '/history',  icon: Clock,        label: 'Past Projects' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#1a1d27',
      borderRight: '1px solid #2a2f45',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #2a2f45',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f2ff', letterSpacing: '-0.3px' }}>
              AuctionCRM
            </div>
            <div style={{ fontSize: 11, color: '#555b75' }}>Lead Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? '#f0f2ff' : '#8b8fa8',
              background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2f45' }}>
        <div style={{ fontSize: 11, color: '#555b75' }}>v1.1.0 — Live Data</div>
      </div>
    </aside>
  )
}
