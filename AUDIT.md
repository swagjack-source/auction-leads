# CT System — Code Audit

**Date:** 2026-04-19  
**Auditor:** Claude Code  
**Branch:** master  
**Scope:** Read-only. No files were modified.

---

## 1. File Tree (`src/`)

```
src/
├── App.jsx                                   Main app router, all 12 routes and context providers
├── App.css                                   Grid layout and animation overrides
├── main.jsx                                  Vite entry point
├── index.css                                 Global CSS custom properties (design tokens)
├── components/
│   ├── ErrorBoundary.jsx                    React error boundary with dev-mode logging
│   └── Layout/
│   │   └── Sidebar.jsx                      Nav sidebar with logo and 12 page links
│   └── Pipeline/
│       ├── DealScorerModal.jsx              Full-screen deal scorer modal overlay
│       ├── EstimateDoc.jsx                  @react-pdf/renderer document for estimates
│       ├── LeadCard.jsx                     Memoized draggable card for kanban board
│       ├── LeadDrawer.jsx                   Right-side panel showing lead details + checklist
│       ├── LeadModal.jsx                    Create/edit lead form with inline score preview
│       ├── ScoreBadge.jsx                   Score visualization badge (color-coded)
│       ├── ScheduleProjectModal.jsx         Modal to assign crew and project date range
│       └── SendEstimateModal.jsx            Modal to send/print estimate via email
├── data/
│   └── mockLeads.js                         9 hardcoded lead records (NEVER loaded; dead code)
├── hooks/
│   └── useIsMobile.js                       Media query hook for responsive breakpoints
├── lib/
│   ├── canvas-stub.js                       Vite canvas alias required by @react-pdf/renderer
│   ├── logger.js                            Thin wrapper around console.error/warn/info
│   ├── scoring.js                           Deal Scorer engine — bid/labor/margin calculations
│   ├── scoring.test.js                      Vitest unit tests for scoring.js
│   ├── supabase.js                          Supabase client (VITE_SUPABASE_URL + ANON_KEY)
│   ├── TeamContext.jsx                      React context; fetches team_members on mount
│   └── ThemeContext.jsx                     React context for dark/light mode toggle
├── pages/
│   ├── Pipeline.jsx                         Kanban board with HTML5 drag-drop (main page)
│   ├── Projects.jsx                         Grid/list view of leads, filterable
│   ├── DealScorer.jsx                       Full-page scoring calculator
│   ├── Contacts.jsx                         3-pane contact directory
│   ├── Employees.jsx                        Employee cards with project-type assignments
│   ├── History.jsx                          Past-projects table + CSV import
│   ├── CalendarView.jsx                     Month calendar with consult scheduling
│   ├── Schedule.jsx                         Team calendar with project date ranges
│   ├── Training.jsx                         Training guide CRUD with DOMPurify-sanitized HTML
│   ├── Library.jsx                          Asset storage — stub only, not wired to Supabase
│   ├── Inbox.jsx                            Message threads — hardcoded mock data only
│   └── Templates.jsx                        Email template editor — stub only, no data
├── styles/
│   └── constants.js                         Exported style constants (currently minimal)
└── test/
    └── setup.js                             Vitest jsdom global setup
```

---

## 2. Routes / Pages

| Route | Component | Data Source | Tables / Variables |
|-------|-----------|-------------|-------------------|
| `/` | Pipeline.jsx | Supabase | `leads` (all columns, `.range(0, 499)`) |
| `/projects` | Projects.jsx | Supabase | `leads` filtered by status |
| `/scorer` | DealScorer.jsx | Local state + URL param | `?lead=<id>` populates form; no DB write on page |
| `/calendar` | CalendarView.jsx | Supabase | `leads.consult_at`, `team_members` |
| `/contacts` | Contacts.jsx | Supabase | `contacts` |
| `/schedule` | Schedule.jsx | Supabase | `leads.project_start / project_end`, `team_members` |
| `/history` | History.jsx | Supabase | `past_projects` |
| `/employees` | Employees.jsx | Supabase | `employees`, `project_types`, `employee_project_types` |
| `/training` | Training.jsx | Supabase | `training_guides`, `training_progress` |
| `/library` | Library.jsx | Supabase (stub) | `library_assets` — UI present, queries not wired |
| `/inbox` | Inbox.jsx | Hardcoded | `MOCK_MESSAGES` array in-file, 4 records |
| `/templates` | Templates.jsx | None | Stub page, no data layer |

**Context providers wrapping all routes (App.jsx):**
1. `ErrorBoundary` (outer)
2. `ThemeProvider` — dark/light mode
3. `TeamProvider` — fetches `team_members` on app init
4. `BrowserRouter`
5. `ErrorBoundary` (inner)

---

## 3. Supabase Schema (current)

The following tables exist based on all `.sql` migration files in the repo. No remote DB access was available; this is derived from the migration files.

### Tables

```sql
-- Core entity (original, not shown in migrations — assumed to exist)
leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ,
  name              TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  zip_code          TEXT,
  what_they_need    TEXT,
  status            TEXT,           -- pipeline stage name
  square_footage    INTEGER,
  density           TEXT,           -- 'Low' | 'Medium' | 'High'
  item_quality_score INTEGER,       -- 1–10
  job_type          TEXT,           -- 'Clean Out' | 'Auction' | 'Both'
  notes             TEXT,
  deal_score        NUMERIC,
  -- Added by migrations:
  assigned_to       UUID REFERENCES team_members(id) ON DELETE SET NULL,
  consult_at        TIMESTAMPTZ,
  project_start     DATE,
  project_end       DATE,
  crew_size         INTEGER,
  lead_source       TEXT CHECK (lead_source IN (
                      'Google','Referral','Realtor','Staff Referral',
                      'Senior Living Community','Other'))
)

deal_scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns assumed from estimates foreign key; also:
  job_name     TEXT,                -- Added by past_jobs_schema.sql
  bid_tag      TEXT CHECK (bid_tag IN ('underbid','good_bid','overbid'))
)

team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  initials   TEXT
)

employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  name        TEXT NOT NULL,
  role        TEXT,
  phone       TEXT,
  email       TEXT,
  hourly_rate NUMERIC(6,2),
  active      BOOLEAN DEFAULT true
)

project_types (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
)
-- Seeded: 'Clean Out', 'Auction', 'Senior Move', 'Packing/Unpacking', 'In-Person Sale'

employee_project_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  project_type_id UUID REFERENCES project_types(id) ON DELETE CASCADE,
  UNIQUE(employee_id, project_type_id)
)

project_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  estimated_hours NUMERIC(5,2),
  UNIQUE(lead_id, employee_id)
)

contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name       TEXT NOT NULL,
  company    TEXT,
  email      TEXT,
  phone      TEXT,
  type       TEXT CHECK (type IN (
               'Vendor','Partner','Senior Living','Referral Partner',
               'Business Connection','Client','Lead')),
  address    TEXT,
  notes      TEXT,
  tags       TEXT[]
)

meetings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  time        TEXT,
  purpose     TEXT,
  notes       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)

estimates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_score_id UUID REFERENCES deal_scores(id) ON DELETE SET NULL,
  bid_amount    NUMERIC(10,2),
  labour_hours  INTEGER,
  job_type      TEXT,
  status        TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Accepted','Declined')),
  sent_at       TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  notes         TEXT
)

training_guides (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT,
  created_by TEXT
)

training_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  guide_id     UUID REFERENCES training_guides(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  completed    BOOLEAN DEFAULT false,
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  UNIQUE(guide_id, user_id)
)

library_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT CHECK (type IN ('Logo','Shirt Design','Marketing Material','Other')),
  tags        TEXT[],
  uploaded_by TEXT
)

past_projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT now(),
  name               TEXT,                   -- Added by past_jobs_schema.sql
  job_date           DATE,
  job_type           TEXT NOT NULL CHECK (job_type IN ('Clean Out','Auction','Both')),
  square_footage     INTEGER NOT NULL,
  density            TEXT NOT NULL CHECK (density IN ('Low','Medium','High')),
  zip_code           TEXT,
  item_quality       INTEGER CHECK (item_quality BETWEEN 1 AND 10),
  actual_labor_hours INTEGER,
  actual_labor_cost  INTEGER,
  actual_bid         INTEGER,
  actual_profit      INTEGER,
  notes              TEXT,
  bid_tag            TEXT CHECK (bid_tag IN ('underbid','good_bid','overbid'))
)
```

### RLS Policies (current)

All policies are open `FOR ALL TO anon USING (true)` — intentional placeholder until auth is wired. Every table with RLS enabled also grants full read/write to `anon`.

Notable exception: `team_members` has two policies — one for `authenticated` and one for `anon`, both open.

---

## 4. Auth State

**Status: No auth implemented.**

- No `supabase.auth.*` calls anywhere in the codebase.
- No login/signup screens.
- No `AuthContext`, `useSession`, `PrivateRoute`, or session guard.
- All RLS policies explicitly allow the `anon` role full read/write.

**What happens when an unauthenticated user hits `/pipeline`:**
The page loads fully. `TeamProvider` fetches all `team_members`. `Pipeline.jsx` fetches all `leads`. The user can view, create, edit, and delete every record without providing any identity.

The schema files contain this explicit warning (supabase_schema.sql, lines 136–148):
> "DO NOT deploy with real client/employee data until auth is in place."

---

## 5. Hardcoded / Seeded Data

Data that should live in the database but is currently hardcoded in source files:

| Variable | File | Approx. Line | Entity | Count | Notes |
|----------|------|--------------|--------|-------|-------|
| `rawLeads` / `mockLeads` | src/data/mockLeads.js | 3–169 | Lead records | 9 | **Dead code — never imported by any active page.** All leads come from Supabase. |
| `ACTIVE_STAGES` | src/data/mockLeads.js | 184–193 | Pipeline stage names | 8 | Imported widely; should move to a `stages` table or shared constants file |
| `OUTCOME_STAGES` | src/data/mockLeads.js | 195 | Pipeline stage names | 3 | Same as above |
| `MOCK_MESSAGES` | src/pages/Inbox.jsx | 4–29 | Email messages | 4 | Inbox renders these exclusively; no Supabase query exists |
| `JOB_FILTERS` | src/pages/Pipeline.jsx | 12 | Filter label strings | 4 | Low priority; belongs in constants |
| `OUTCOME_FILTERS` | src/pages/Pipeline.jsx | 14–18 | Filter objects with colors | 3 | Same |
| `DENSITY_OPTIONS` | src/pages/DealScorer.jsx | 12–16 | Dropdown options | 3 | Could stay in component |
| `JOB_TYPE_OPTIONS` | src/pages/DealScorer.jsx | 18–22 | Dropdown options | 3 | Same |
| `BID_TAGS` | src/pages/History.jsx | 31–35 | Bid result tag labels | 3 | Duplicates DB CHECK constraint values |
| `CONTACT_TYPES` | src/pages/Contacts.jsx | 5 | Contact category values | 7 | Duplicates DB CHECK constraint; drift risk |
| `ROLE_OPTIONS` | src/pages/Employees.jsx | 5 | Employee role values | 6 | Should match any future DB CHECK constraint |
| `CATEGORIES` | src/pages/Training.jsx | 6 | Training category values | 9 | No DB constraint; drift risk |
| `DEFAULT_CHECKLIST` | src/components/Pipeline/LeadDrawer.jsx | 27–33 | Lead checklist items | 5 | Displayed in UI; not persisted to DB |
| `STAGE_META` | src/components/Pipeline/StageColumn.jsx | 5–17 | Stage colors | 11 | Should live alongside stage definitions |

**High priority:** `MOCK_MESSAGES` in Inbox.jsx makes the entire Inbox page non-functional with real data. `DEFAULT_CHECKLIST` in LeadDrawer is shown to users but never saved.

---

## 6. Top 5 Code Smells (by impact)

### #1 — No auth guards on any route
**File:** [src/App.jsx](src/App.jsx) (lines 177–188, all `<Route>` entries)  
**Impact: CRITICAL**  
All 12 routes render unconditionally. An unauthenticated user who knows the URL (or guesses `/pipeline`) gets full read/write access to the entire database. Combined with the open `anon` RLS policies, this is a complete data security hole. Must be fixed before any real data is entered.

### #2 — No organization/tenant scoping on any table
**File:** All `.sql` migration files  
**Impact: CRITICAL**  
Zero tables have `organization_id`, `franchise_id`, or `tenant_id`. If this product is ever deployed to two CT franchises, all data is globally shared — one franchise's leads, employees, and contacts are visible to every other. Retrofitting multi-tenancy after real data exists is extremely painful; the window to do it cheaply is now.

### #3 — Pipeline drag-drop event handlers recreated every render
**File:** [src/pages/Pipeline.jsx](src/pages/Pipeline.jsx) (lines 384–400)  
**Impact: HIGH**  
Five event handlers (`onDragOver`, `onDragLeave`, `onDrop`, `onDragStart`, `onDragEnd`) are defined as inline arrow functions inside the `.map()` that renders stage columns. `StageColumn` is wrapped in `React.memo`, but memo is defeated because a new function reference is passed on every parent re-render. During a drag, Pipeline re-renders frequently (hover state updates), causing all 11 columns and their cards to re-render unnecessarily. This is the primary cause of reported drag-drop lag.

### #4 — Inbox page is entirely mock data with no DB path
**File:** [src/pages/Inbox.jsx](src/pages/Inbox.jsx) (lines 4–29)  
**Impact: HIGH**  
`MOCK_MESSAGES` is a hardcoded 4-item array. No Supabase table for messages/threads exists in any migration file. The Inbox is a dead end — if a franchise owner navigates to it expecting real messages from leads, they will see four fake names. This should be clearly flagged in the UI as "coming soon" or removed from the sidebar until wired up.

### #5 — `team_members` vs `employees` split is confusing and may cause data drift
**File:** supabase_schema.sql + contacts_meetings_schema.sql  
**Impact: MEDIUM**  
Two separate tables represent "people who work here": `team_members` (name, color, initials — used for calendar assignment) and `employees` (name, role, phone, email, hourly_rate — used for crew management). There is no foreign key or join between them. A person added to `employees` for payroll purposes must be manually re-added to `team_members` to appear on the calendar. Likely to diverge in production.

---

## 7. Tenant Isolation Audit

**Result: No tenant isolation exists anywhere.**

| Table | organization_id | franchise_id | tenant_id | Needs Tenant Column? |
|-------|:-:|:-:|:-:|:--|
| leads | — | — | — | **YES** — every lead must be scoped to one franchise |
| team_members | — | — | — | **YES** — team is per-franchise |
| employees | — | — | — | **YES** — employees are per-franchise |
| contacts | — | — | — | **YES** — contact directory is per-franchise |
| meetings | — | — | — | **YES** — meetings are per-franchise |
| estimates | — | — | — | YES (inherits from leads via lead_id, but needs direct column for RLS) |
| training_guides | — | — | — | **YES** — guides may be shared (corporate) or franchise-specific; needs a scope flag |
| training_progress | — | — | — | YES (scoped by user_id, but user_id is currently plain TEXT with no auth) |
| library_assets | — | — | — | YES — logos and designs are per-franchise |
| past_projects | — | — | — | **YES** — historical job data is per-franchise |
| project_assignments | — | — | — | YES (inherits from leads, same caveat as estimates) |
| employee_project_types | — | — | — | YES (inherits from employees) |
| deal_scores | — | — | — | **YES** |
| project_types | — | — | — | Possibly shared (corporate-defined list); evaluate |

**Recommendation:** Add `organization_id UUID NOT NULL REFERENCES organizations(id)` to every table marked **YES** in the same migration that creates the `organizations` table. RLS policies should then use `USING (organization_id = auth.jwt() ->> 'organization_id')`.

---

## 8. Pipeline Kanban Performance Diagnosis

### Root cause 1 — Inline arrow functions defeat `React.memo` on StageColumn
**File:** [src/pages/Pipeline.jsx](src/pages/Pipeline.jsx) (lines ~384–400)

```jsx
// All five handlers are re-created on every Pipeline render:
onDragOver={e  => { e.preventDefault(); setHoverCol(stage) }}
onDragLeave={() => setHoverCol(null)}
onDrop={e      => { /* drop logic */ }}
onDragStart={(e, id) => { setDraggingId(id); ... }}
onDragEnd={() => { setDraggingId(null); setHoverCol(null) }}
```

`StageColumn` is memoized but receives a new function reference on every render → memo bails out → all 11 columns re-render. Fix: wrap each handler in `useCallback`.

### Root cause 2 — Hover state in `LeadCard` triggers local re-render per card
**File:** [src/components/Pipeline/LeadCard.jsx](src/components/Pipeline/LeadCard.jsx) (lines ~25, 63–64)

```jsx
const [hover, setHover] = useState(false)
// ...
onMouseEnter={() => setHover(true)}
onMouseLeave={() => setHover(false)}
```

Moving the mouse across any card fires two state updates. Because `LeadCard` is memoized this is self-contained, but the two inline handlers (`onMouseEnter`/`onMouseLeave`) are recreated on each LeadCard render. Low impact individually; multiplied across many cards in a busy column it accumulates.

### Root cause 3 — `color-mix()` computed in render body (minor)
**File:** [src/components/Pipeline/LeadCard.jsx](src/components/Pipeline/LeadCard.jsx) (line ~47)

```jsx
const cardBg = stageSoft
  ? `color-mix(in oklab, ${stageSoft} 18%, var(--panel))`
  : 'var(--panel)'
```

This string is rebuilt on every render. Since `stageSoft` comes from a static `STAGE_META` lookup, it could be memoized or moved to a module-level cache. Low individual cost; worth fixing as part of a broader pass.

### Root cause 4 — `hoverCol` state in Pipeline causes full board re-render
**File:** [src/pages/Pipeline.jsx](src/pages/Pipeline.jsx)

`hoverCol` is stored in Pipeline's state. Every time the mouse enters/leaves a column, Pipeline re-renders, which (due to root cause 1) triggers all StageColumns and their LeadCards to re-render. Moving `hoverCol` into a ref (`useRef`) and passing the active column via a context or a stable prop would break this chain.

---

## Appendix — Dependencies

| Package | Version | Role |
|---------|---------|------|
| react | ^19.2.4 | UI framework |
| react-dom | ^19.2.4 | DOM renderer |
| react-router-dom | ^7.14.1 | Client-side routing |
| @supabase/supabase-js | ^2.103.0 | DB + Auth client |
| @react-pdf/renderer | ^4.5.1 | Estimate PDF generation |
| dompurify | ^3.4.0 | XSS sanitization for training HTML |
| lucide-react | ^1.8.0 | Icon set |
| tailwindcss | ^4.2.2 | Utility CSS (Vite plugin) |
| vite | ^8.0.4 | Build tool |
| vitest | ^4.1.4 | Unit test runner |

---

*End of audit. No files were modified.*
