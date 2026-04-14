import { NavLink } from 'react-router-dom'
import { Columns3, Calculator, CalendarDays, Clock } from 'lucide-react'

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
      background: '#00263E',
      borderRight: '1px solid #004065',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid #004065' }}>
        <img
          src="/CT DenverSE logo - Black.png"
          alt="Caring Transitions Denver Southeast"
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block' }}
          style={{ width: '100%', borderRadius: 8, background: '#fff', padding: '10px 12px', display: 'block' }}
        />
        {/* Fallback shown while logo.png is missing */}
        <div style={{ display: 'none', padding: '12px 10px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f2ff', lineHeight: 1.2 }}>Caring Transitions</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#A50050', marginTop: 2 }}>Denver Southeast</div>
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
              color: isActive ? '#f0f2ff' : '#6da8c5',
              background: isActive ? 'rgba(165,0,80,0.20)' : 'transparent',
              borderLeft: isActive ? '3px solid #A50050' : '3px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #004065' }}>
        <div style={{ fontSize: 10, color: '#3d7a99', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Caring Transitions Denver SE
        </div>
        <div style={{ fontSize: 10, color: '#004065', marginTop: 2 }}>
          Lead Management System
        </div>
      </div>
    </aside>
  )
}
