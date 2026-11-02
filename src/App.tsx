import { useState } from "react"
import { CalendarDays, HardDrive, Menu, Users, BarChart3 } from "lucide-react"
import { BackupPanel } from "./components/BackupPanel"
import { MenPanel } from "./components/MenPanel"
import { ReportPanel } from "./components/ReportPanel"
import { TodayPanel } from "./components/TodayPanel"
import { RefreshProvider } from "./refresh"

type PanelId = "today" | "report" | "men" | "backup"

const NAV: { id: PanelId; label: string; icon: typeof CalendarDays }[] = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "report", label: "Report", icon: BarChart3 },
  { id: "men", label: "Delivery men", icon: Users },
  { id: "backup", label: "Backup", icon: HardDrive },
]

export default function App() {
  return (
    <RefreshProvider>
      <Shell />
    </RefreshProvider>
  )
}

function Shell() {
  const [panel, setPanel] = useState<PanelId>("today")
  const [menuOpen, setMenuOpen] = useState(false)
  const current = NAV.find((item) => item.id === panel)?.label ?? "Today"

  function open(next: PanelId) {
    setPanel(next)
    setMenuOpen(false)
  }

  return (
    <div className="app">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="7" y="3" width="10" height="18" rx="4" />
              <path d="M9 8h6" />
            </svg>
          </span>
          <div>
            <p className="brand-name">Gas delivery</p>
            <p className="brand-sub">Cylinder book</p>
          </div>
        </div>
        <nav aria-label="Sections">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={panel === item.id ? "nav-btn on" : "nav-btn"}
                onClick={() => open(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>
      {menuOpen ? <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={18} />
          </button>
          <p className="topbar-title">{current}</p>
        </header>
        {panel === "today" ? <TodayPanel /> : null}
        {panel === "report" ? <ReportPanel /> : null}
        {panel === "men" ? <MenPanel /> : null}
        {panel === "backup" ? <BackupPanel /> : null}
      </div>
    </div>
  )
}
