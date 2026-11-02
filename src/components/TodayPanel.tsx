import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { addDays, formatNotebook, sumCounts, todayISO, totalOf, weekday } from "../cylinders"
import { entriesOn, listMen } from "../db"
import { useRefresh } from "../refresh"
import type { DayEntry, DeliveryMan } from "../types"
import { dayMessage } from "../whatsapp"
import { CylinderBadges } from "./CylinderBadge"
import { DatePicker } from "./DatePicker"
import { EntryDialog } from "./EntryDialog"
import { ShareBar } from "./ShareBar"

export function TodayPanel() {
  const { tick, refresh } = useRefresh()
  const [date, setDate] = useState(() => todayISO())
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [men, setMen] = useState<DeliveryMan[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<DayEntry | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    Promise.all([entriesOn(date), listMen()])
      .then(([rows, people]) => {
        if (cancelled) return
        setEntries(rows)
        setMen(people)
        setLoadedFor(date)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [date, tick])

  const current = status === "ready" && loadedFor === date
  const visible = current ? entries : []
  const totals = sumCounts(visible.map((entry) => entry.counts))
  const message = dayMessage(date, visible)
  const today = todayISO()

  return (
    <div className="panel">
      <div className="panel-body">
        <div className="toolbar">
          <h1 className="screen-title">Deliveries</h1>
          <button type="button" className="btn" onClick={() => setEditing(null)}>
            <Plus size={16} />
            Add delivery
          </button>
        </div>

        <div className="date-bar">
          <button type="button" className="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft size={18} />
          </button>
          <DatePicker value={date} onChange={setDate} />
          <button type="button" className="icon-btn" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight size={18} />
          </button>
          {date !== today ? (
            <button type="button" className="btn secondary slim" onClick={() => setDate(today)}>
              Today
            </button>
          ) : null}
        </div>

        {status === "error" ? <p className="form-error">Could not open the saved deliveries on this device.</p> : null}
        {!current && status !== "error" ? <p className="muted">Loading…</p> : null}
        {current && entries.length === 0 ? <p className="empty">Nothing recorded for this day.</p> : null}

        <ul className="entry-list">
          {visible.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="entry" onClick={() => setEditing(entry)}>
                <span className="entry-top">
                  <span className="entry-name">{entry.deliveryManName}</span>
                  <span className="badge total">{totalOf(entry.counts)}</span>
                </span>
                <CylinderBadges counts={entry.counts} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {current ? <ShareBar counts={totals} text={message} disabled={entries.length === 0} /> : null}

      {editing !== undefined ? (
        <EntryDialog
          date={date}
          dateLabel={`${formatNotebook(date)} · ${weekday(date)}`}
          entry={editing}
          men={men}
          entries={entries}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            refresh()
          }}
        />
      ) : null}
    </div>
  )
}
