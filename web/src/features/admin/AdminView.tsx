import { useState } from 'react'
import { ChevronRight, ChevronLeft, Search } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { ADMIN_GROUPS, ADMIN_SECTIONS } from './sections'
import { UsersTab }         from './UsersTab'
import { TeamsTab }         from './TeamsTab'
import { CategoriesTab }    from './CategoriesTab'
import { RolesTab }         from './RolesTab'
import { ServicesTab }      from './ServicesTab'
import { SlaPoliciesTab }   from './SlaPoliciesTab'
import { BusinessHoursTab } from './BusinessHoursTab'
import { WorkflowTab }      from './WorkflowTab'
import { AutomationsTab }   from './AutomationsTab'
import { WorkspacesTab }    from './WorkspacesTab'
import type { AdminSection } from '../../types'

interface Props { addToast: (msg: string) => void }

// ── Section content router ──────────────────────────────────────────────────────
// Maps the active admin section id to its corresponding tab component.
function SectionContent({ section, addToast }: { section: AdminSection; addToast: (m: string) => void }) {
  switch (section) {
    case 'workspaces':     return <WorkspacesTab    addToast={addToast} />
    case 'users':          return <UsersTab         addToast={addToast} />
    case 'teams':          return <TeamsTab         addToast={addToast} />
    case 'categories':     return <CategoriesTab    addToast={addToast} />
    case 'roles':          return <RolesTab         addToast={addToast} />
    case 'services':       return <ServicesTab      addToast={addToast} />
    case 'sla-policies':   return <SlaPoliciesTab   addToast={addToast} />
    case 'business-hours': return <BusinessHoursTab addToast={addToast} />
    case 'workflow':       return <WorkflowTab      addToast={addToast} />
    case 'automations':    return <AutomationsTab   addToast={addToast} />
    default:               return null
  }
}

// Top-level Administration view: shows the home hub when at home, otherwise the section
// view (rail + content). Hub/section navigation state lives in the global app store.
export function AdminView({ addToast }: Props) {
  const { adminSection, adminAtHome, openAdminSection, goAdminHome } = useAppStore()
  const [hubSearch, setHubSearch]   = useState('')
  const [railSearch, setRailSearch] = useState('')

  return adminAtHome
    ? <AdminHome search={hubSearch} setSearch={setHubSearch} onOpen={openAdminSection} />
    : <AdminSectionView
        section={adminSection}
        railSearch={railSearch}
        setRailSearch={setRailSearch}
        onOpen={openAdminSection}
        onHome={goAdminHome}
        addToast={addToast}
      />
}

// ── Home hub ────────────────────────────────────────────────────────────────────
// Landing grid of all admin sections as cards, with a search box that filters by label/description.
function AdminHome({ search, setSearch, onOpen }: {
  search: string
  setSearch: (s: string) => void
  onOpen: (s: AdminSection) => void
}) {
  // Filter groups/items by the search query (matches label or description); drop empty groups.
  const q = search.trim().toLowerCase()
  const groups = ADMIN_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => !q || i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="h-full overflow-y-auto -mx-6 -mt-4 bg-canvas">
      <div className="mx-auto max-w-[1100px] px-10 pt-10 pb-16">
        <h1 className="text-[32px] font-semibold text-text-primary leading-tight">Administration</h1>
        <p className="text-[18px] text-text-tertiary mt-2 mb-7">
          Configure workspaces, people, services, and policies for your IT operation.
        </p>

        {/* Jump-to-a-setting search */}
        <div className="relative max-w-[520px] mb-9">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Jump to a setting…"
            className="w-full rounded-lg text-[17px] py-2.5 pl-[42px] pr-3 bg-surface border-2 border-[#9aa3b2] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {groups.length === 0 ? (
          <p className="text-center text-[17px] text-text-muted py-16">No settings match “{search}”.</p>
        ) : groups.map(group => (
          <div key={group.title} className="mb-8">
            <h2 className="text-[12px] font-bold uppercase tracking-[1.4px] text-text-muted mb-3">{group.title}</h2>
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className="group text-left rounded-[10px] border border-border-default bg-surface p-[18px] transition-all duration-[120ms] hover:border-accent hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] hover:-translate-y-px"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[9px] bg-subtle flex items-center justify-center shrink-0 text-text-secondary">
                      <item.Icon size={19} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[19px] font-semibold text-text-primary leading-tight">{item.label}</span>
                        <ChevronRight size={18} className="text-[#c2c8d2] shrink-0" />
                      </div>
                      <p className="text-[15px] text-text-tertiary leading-[1.45] mt-1">{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section view (rail + header + content) ──────────────────────────────────────
// Renders the left nav rail (searchable section list + back-to-overview), a sticky section
// header, and the active section's content. Users tab fills the area; others scroll with padding.
function AdminSectionView({ section, railSearch, setRailSearch, onOpen, onHome, addToast }: {
  section: AdminSection
  railSearch: string
  setRailSearch: (s: string) => void
  onOpen: (s: AdminSection) => void
  onHome: () => void
  addToast: (m: string) => void
}) {
  const meta = ADMIN_SECTIONS[section]
  // Normalised rail search query used to filter the nav items below.
  const rq = railSearch.trim().toLowerCase()

  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">

      {/* ── Secondary rail (de-rainbowed) ──────────────────────────────────── */}
      <nav className="w-[228px] shrink-0 flex flex-col overflow-y-auto bg-[#fbfcfd] border-r border-border-default">
        <div className="p-3 flex flex-col gap-2">
          <button
            onClick={onHome}
            className="flex items-center gap-1.5 self-start text-[15px] text-text-secondary hover:text-text-primary hover:bg-hover rounded-md px-2 py-1.5 transition-colors"
          >
            <ChevronLeft size={15} /> Overview
          </button>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              value={railSearch}
              onChange={e => setRailSearch(e.target.value)}
              placeholder="Find a setting…"
              className="w-full rounded-md text-[15px] py-1.5 pl-8 pr-2 bg-surface border-2 border-[#c4cad6] focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {ADMIN_GROUPS.map(group => {
          const items = group.items.filter(i => !rq || i.label.toLowerCase().includes(rq))
          if (items.length === 0) return null
          return (
            <div key={group.title} className="px-3 pb-2">
              <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-text-muted px-2 pt-1 pb-1.5">{group.title}</div>
              <div className="flex flex-col gap-0.5">
                {items.map(item => {
                  const active = item.id === section
                  return (
                    <button
                      key={item.id}
                      onClick={() => onOpen(item.id)}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[16px] text-left transition-colors"
                      style={active
                        ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)', fontWeight: 500 }
                        : { color: 'var(--text-secondary)' }
                      }
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
                    >
                      <item.Icon size={16} className="shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Section content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Sticky section header */}
        <div className="shrink-0 bg-surface border-b border-border-default px-7 py-[18px] flex items-center gap-3.5">
          <div
            className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            <meta.Icon size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[22px] font-semibold text-text-primary leading-tight">{meta.label}</h2>
            <p className="text-[15px] text-text-muted mt-0.5 leading-snug">{meta.description}</p>
          </div>
        </div>

        {/* Body — Users fills the area (its own list+panel layout); others scroll with padding */}
        {section === 'users' ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <SectionContent section={section} addToast={addToast} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
            <SectionContent section={section} addToast={addToast} />
          </div>
        )}
      </div>
    </div>
  )
}
