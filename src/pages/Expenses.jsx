import { useState } from 'react'
import { Download, Plus, RefreshCw, Wallet, Check, Clock, MoreHorizontal } from 'lucide-react'

const EXPENSE_RECURRING = [
  { id: 'E01', name: 'Warehouse rent',           vendor: 'Cedar Industrial LLC',  cat: 'Facilities',   monthly: 4200, nextDue: 'May 1',   payMethod: 'ACH · Chase 2314', tag: 'critical' },
  { id: 'E02', name: 'CTBids platform fee',      vendor: 'Caring Transitions',    cat: 'Software',     monthly: 450,  nextDue: 'May 5',   payMethod: 'Auto-deduct',      tag: null },
  { id: 'E03', name: 'ShippingSaint',            vendor: 'ShippingSaint Inc.',    cat: 'Software',     monthly: 189,  nextDue: 'Apr 28',  payMethod: 'Auto-deduct',      tag: null },
  { id: 'E04', name: 'Insurance — GL + Auto',    vendor: 'State Farm Commercial', cat: 'Insurance',    monthly: 820,  nextDue: 'May 10',  payMethod: 'ACH',              tag: null },
  { id: 'E05', name: 'Payroll service',          vendor: 'Gusto',                 cat: 'Software',     monthly: 145,  nextDue: 'Apr 30',  payMethod: 'Auto-deduct',      tag: null },
  { id: 'E06', name: 'Fuel card — crew vans',    vendor: 'Fleet Advantage',       cat: 'Vehicle',      monthly: 1180, nextDue: 'May 3',   payMethod: 'Auto-deduct',      tag: 'variable' },
  { id: 'E07', name: 'Storage units (4)',        vendor: 'Public Storage',        cat: 'Facilities',   monthly: 680,  nextDue: 'May 1',   payMethod: 'Auto-deduct',      tag: null },
  { id: 'E08', name: 'Phone + Internet',         vendor: 'Comcast Business',      cat: 'Utilities',    monthly: 295,  nextDue: 'Apr 26',  payMethod: 'ACH',              tag: null },
  { id: 'E09', name: 'CRM (this platform)',      vendor: 'Homebase',              cat: 'Software',     monthly: 299,  nextDue: 'May 1',   payMethod: 'Card · x4411',     tag: null },
  { id: 'E10', name: 'Bookkeeping (contractor)', vendor: 'N. Patel, CPA',         cat: 'Professional', monthly: 600,  nextDue: 'May 15',  payMethod: 'Check',            tag: null },
  { id: 'E11', name: 'Marketing — Google Ads',   vendor: 'Google',                cat: 'Marketing',    monthly: 900,  nextDue: 'Ongoing', payMethod: 'Card · x4411',     tag: 'variable' },
  { id: 'E12', name: 'Dumpster rental (weekly)', vendor: 'Waste Mgmt',            cat: 'Operations',   monthly: 1250, nextDue: 'Weekly',  payMethod: 'Invoice',          tag: 'variable' },
]

const EXPENSE_PROJECT = [
  { id: 'PX1', date: 'Apr 19', project: 'Delgado Estate',  line: 'Crew — 3 people × 8 hrs',  cat: 'Labor',        amount: 960,  billable: true  },
  { id: 'PX2', date: 'Apr 19', project: 'Delgado Estate',  line: 'Haul-away / landfill fee',  cat: 'Disposal',     amount: 340,  billable: true  },
  { id: 'PX3', date: 'Apr 18', project: 'Whitney Trust',   line: 'Appraisal — fine art',      cat: 'Professional', amount: 1200, billable: true  },
  { id: 'PX4', date: 'Apr 17', project: 'Ellwood',         line: 'Packing materials',         cat: 'Supplies',     amount: 168,  billable: true  },
  { id: 'PX5', date: 'Apr 17', project: 'Murphy Auction',  line: 'Photography — catalog',     cat: 'Professional', amount: 450,  billable: true  },
  { id: 'PX6', date: 'Apr 16', project: 'Yee Residence',   line: 'Fuel — 2 vans',             cat: 'Vehicle',      amount: 82,   billable: false },
  { id: 'PX7', date: 'Apr 15', project: 'Delgado Estate',  line: 'Shrink wrap + boxes',       cat: 'Supplies',     amount: 112,  billable: true  },
  { id: 'PX8', date: 'Apr 14', project: 'Hua Clean-Out',   line: 'Storage unit — 30 days',    cat: 'Facilities',   amount: 185,  billable: false },
  { id: 'PX9', date: 'Apr 12', project: 'Bettencourt',     line: 'Locksmith — rekey',         cat: 'Professional', amount: 140,  billable: true  },
]

const CAT_STYLE = {
  Facilities:   { bg: '#ECEEF2', fg: '#3E5C86' },
  Software:     { bg: '#E4ECF6', fg: '#2B4468' },
  Insurance:    { bg: '#F1E1E1', fg: '#A14646' },
  Vehicle:      { bg: '#F5ECD6', fg: '#7A5417' },
  Utilities:    { bg: '#ECE6F4', fg: '#5C3F88' },
  Professional: { bg: '#E3EEE8', fg: '#2F7A55' },
  Marketing:    { bg: '#FFEFD9', fg: '#7A5417' },
  Operations:   { bg: '#EFEFEB', fg: '#60605A' },
  Labor:        { bg: '#E3EEE8', fg: '#2F7A55' },
  Disposal:     { bg: '#EFEFEB', fg: '#60605A' },
  Supplies:     { bg: '#ECE6F4', fg: '#5C3F88' },
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ padding: '20px 28px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>
    </div>
  )
}

function MiniStat({ label, value, sub, tint, fg, icon: Ico }) {
  return (
    <div style={{
      background: `color-mix(in oklab, ${tint} 22%, var(--panel))`,
      border: '1px solid var(--line)', borderRadius: 12,
      padding: '12px 14px', boxShadow: 'var(--shadow-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: tint, color: fg, display: 'grid', placeItems: 'center' }}>
          <Ico size={13} strokeWidth={1.9} />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div className="tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function RecurringTable() {
  const total = EXPENSE_RECURRING.reduce((s, e) => s + e.monthly, 0)
  return (
    <div style={{ padding: '18px 28px 28px' }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 100px 1fr 90px 36px', gap: 12, padding: '10px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Expense</span><span>Vendor</span><span>Category</span>
          <span style={{ textAlign: 'right' }}>Monthly</span>
          <span>Next due</span><span>Method</span><span />
        </div>
        {EXPENSE_RECURRING.map((e, i) => {
          const cat = CAT_STYLE[e.cat] || { bg: 'var(--hover)', fg: 'var(--ink-3)' }
          return (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 100px 1fr 90px 36px', gap: 12, padding: '12px 16px', alignItems: 'center', borderBottom: i < EXPENSE_RECURRING.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 12.5 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{e.name}</div>
                {e.tag && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: e.tag === 'critical' ? '#A14646' : '#7A5417', background: e.tag === 'critical' ? '#F1E1E1' : '#F5ECD6', padding: '1px 6px', borderRadius: 4, marginTop: 2, display: 'inline-block' }}>
                    {e.tag === 'critical' ? 'CRITICAL' : 'VARIABLE'}
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--ink-2)' }}>{e.vendor}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: cat.fg, background: cat.bg, padding: '2px 8px', borderRadius: 999, justifySelf: 'start' }}>{e.cat}</span>
              <span className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>${e.monthly.toLocaleString()}</span>
              <span className="tnum" style={{ color: 'var(--ink-2)', fontSize: 12 }}>{e.nextDue}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.payMethod.split(' · ')[0]}</span>
              <button style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
                <MoreHorizontal size={14} />
              </button>
            </div>
          )
        })}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 100px 1fr 90px 36px', gap: 12, padding: '12px 16px', background: 'var(--bg-2)', borderTop: '1px solid var(--line)', fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>
          <span>Monthly total</span>
          <span /><span />
          <span className="tnum" style={{ textAlign: 'right' }}>${total.toLocaleString()}</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 11.5 }}>
            Annualized: <span className="tnum">${(total * 12).toLocaleString()}</span>
          </span>
          <span /><span />
        </div>
      </div>
    </div>
  )
}

function ProjectExpensesTable() {
  return (
    <div style={{ padding: '18px 28px 28px' }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1.2fr 2fr 120px 100px 70px 36px', gap: 12, padding: '10px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Date</span><span>Project</span><span>Line item</span><span>Category</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
          <span>Billable</span><span />
        </div>
        {EXPENSE_PROJECT.map((e, i) => {
          const cat = CAT_STYLE[e.cat] || { bg: 'var(--hover)', fg: 'var(--ink-3)' }
          return (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '80px 1.2fr 2fr 120px 100px 70px 36px', gap: 12, padding: '12px 16px', alignItems: 'center', borderBottom: i < EXPENSE_PROJECT.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 12.5 }}>
              <span className="tnum" style={{ color: 'var(--ink-3)' }}>{e.date}</span>
              <span style={{ fontWeight: 600 }}>{e.project}</span>
              <span style={{ color: 'var(--ink-2)' }}>{e.line}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: cat.fg, background: cat.bg, padding: '2px 8px', borderRadius: 999, justifySelf: 'start' }}>{e.cat}</span>
              <span className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>${e.amount.toLocaleString()}</span>
              {e.billable
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2F7A55', fontWeight: 600 }}><Check size={12} strokeWidth={2.2} /> Yes</span>
                : <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Overhead</span>
              }
              <button style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}>
                <MoreHorizontal size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BudgetView() {
  const budgets = [
    { cat: 'Facilities',   budget: 5100, actual: 4880, forecast: 5100 },
    { cat: 'Software',     budget: 1200, actual: 1083, forecast: 1183 },
    { cat: 'Marketing',    budget: 1500, actual: 1020, forecast: 1380 },
    { cat: 'Vehicle',      budget: 1400, actual: 1262, forecast: 1420 },
    { cat: 'Insurance',    budget: 850,  actual: 820,  forecast: 820  },
    { cat: 'Professional', budget: 800,  actual: 600,  forecast: 600  },
    { cat: 'Operations',   budget: 1400, actual: 1250, forecast: 1250 },
  ]
  return (
    <div style={{ padding: '18px 28px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {budgets.map(b => {
        const pct = (b.actual / b.budget) * 100
        const over = pct > 100
        const near = pct > 85
        const cat = CAT_STYLE[b.cat] || { bg: 'var(--hover)', fg: 'var(--ink-3)' }
        return (
          <div key={b.cat} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: cat.fg, background: cat.bg, padding: '2px 8px', borderRadius: 999 }}>{b.cat}</span>
              <div style={{ flex: 1 }} />
              <span className="tnum" style={{ fontSize: 14, fontWeight: 600 }}>${b.actual.toLocaleString()}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>/ ${b.budget.toLocaleString()}</span>
            </div>
            <div style={{ height: 7, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: over ? '#A14646' : near ? '#C8A14A' : '#2F7A55', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)' }}>
              <span>{Math.round(pct)}% of budget</span>
              <div style={{ flex: 1 }} />
              <span>Forecast: <span className="tnum" style={{ color: over ? '#A14646' : 'var(--ink-2)', fontWeight: 600 }}>${b.forecast.toLocaleString()}</span></span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Expenses() {
  const [tab, setTab] = useState('recurring')

  const recTotal = EXPENSE_RECURRING.reduce((s, e) => s + e.monthly, 0)
  const projTotal = EXPENSE_PROJECT.reduce((s, e) => s + e.amount, 0)
  const projBillable = EXPENSE_PROJECT.filter(e => e.billable).reduce((s, e) => s + e.amount, 0)

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
      <PageHeader
        title="Expenses"
        subtitle={`$${recTotal.toLocaleString()}/mo recurring · $${projTotal.toLocaleString()} project costs this month`}
        actions={
          <>
            <button style={btnGhost}><Download size={14} strokeWidth={1.8} /> Export CSV</button>
            <button style={btnPrimary}><Plus size={14} strokeWidth={2} /> Add Expense</button>
          </>
        }
      />

      <div style={{ padding: '0 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MiniStat label="Monthly recurring"     value={`$${(recTotal / 1000).toFixed(1)}k`}    sub={`${EXPENSE_RECURRING.length} line items`}                              tint="#ECEEF2" fg="#3E5C86" icon={RefreshCw} />
        <MiniStat label="Project costs (MTD)"   value={`$${(projTotal / 1000).toFixed(1)}k`}   sub={`${EXPENSE_PROJECT.length} expenses`}                                  tint="#F5ECD6" fg="#7A5417" icon={Wallet}    />
        <MiniStat label="Billable to client"    value={`$${(projBillable / 1000).toFixed(1)}k`} sub={`${Math.round(projBillable / projTotal * 100)}% of project costs`}   tint="#E3EEE8" fg="#2F7A55" icon={Check}     />
        <MiniStat label="Upcoming — next 7 days" value="$6,734"                                 sub="4 payments due"                                                       tint="#F1E1E1" fg="#A14646" icon={Clock}     />
      </div>

      <div style={{ padding: '18px 28px 0', display: 'flex', gap: 6, borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'recurring', label: 'Recurring',     count: EXPENSE_RECURRING.length },
          { id: 'project',   label: 'Project costs', count: EXPENSE_PROJECT.length   },
          { id: 'budget',    label: 'Budget',        count: null                     },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', borderRadius: 0, border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 13, fontWeight: 600, color: tab === t.id ? 'var(--ink-1)' : 'var(--ink-3)', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, fontFamily: 'inherit' }}>
            {t.label}
            {t.count != null && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'recurring' && <RecurringTable />}
      {tab === 'project'   && <ProjectExpensesTable />}
      {tab === 'budget'    && <BudgetView />}
    </div>
  )
}

const btnPrimary = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', boxShadow: '0 1px 2px rgba(43,68,104,0.25)', fontFamily: 'inherit' }
const btnGhost   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', fontWeight: 500, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink-2)', fontFamily: 'inherit' }
