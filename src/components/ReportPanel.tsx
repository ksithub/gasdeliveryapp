import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  CYLINDERS,
  formatNotebook,
  groupByDate,
  groupByMan,
  monthTitle,
  rangeFor,
  shiftMonth,
  sumCounts,
  todayISO,
  totalOf,
  type RangePreset,
} from "../cylinders"
import { entriesBetween } from "../db"
import { useRefresh } from "../refresh"
import type { DayEntry } from "../types"
import { reportMessage } from "../whatsapp"
import { DatePicker } from "./DatePicker"
import { ShareBar } from "./ShareBar"

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "first-half", label: "1–15" },
  { id: "second-half", label: "16–end" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
]

export function ReportPanel() {
  const { tick } = useRefresh()
  const [preset, setPreset] = useState<RangePreset>("today")
  const [monthAnchor, setMonthAnchor] = useState(todayISO())
  const [customFrom, setCustomFrom] = useState(todayISO())
  const [customTo, setCustomTo] = useState(todayISO())
  const [view, setView] = useState<"day" | "man">("day")
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const range = useMemo(
    () => rangeFor(preset, preset === "today" || preset === "yesterday" ? todayISO() : monthAnchor, { from: customFrom, to: customTo }),
    [preset, monthAnchor, customFrom, customTo],
  )

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    entriesBetween(range.from, range.to)
      .then((rows) => {
        if (cancelled) return
        setEntries(rows)
        setLoadedKey(`${range.from}:${range.to}`)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [range.from, range.to, tick])

  const rangeKey = `${range.from}:${range.to}`
  const current = status === "ready" && loadedKey === rangeKey
  const visible = current ? entries : []
  const days = groupByDate(visible)
  const men = groupByMan(visible)
  const totals = sumCounts(visible.map((entry) => entry.counts))
  const text = reportMessage(view, range.from, range.to, visible)
  const showMonth = preset === "first-half" || preset === "second-half" || preset === "month"

  function choose(next: RangePreset) {
    if (next === "custom") {
      setCustomFrom(range.from)
      setCustomTo(range.to)
    }
    setPreset(next)
  }

  return (
    <div className="panel">
      <div className="panel-body">
        <h1 className="screen-title">Report</h1>
        <div className="presets" role="group" aria-label="Date range">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={preset === item.id ? "chip on" : "chip"}
              onClick={() => choose(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {showMonth ? (
          <div className="date-bar compact">
            <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setMonthAnchor(shiftMonth(monthAnchor, -1))}>
              <ChevronLeft size={18} />
            </button>
            <p className="date-sub month-title">{monthTitle(monthAnchor)}</p>
            <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setMonthAnchor(shiftMonth(monthAnchor, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
        ) : null}

        {preset === "custom" ? (
          <div className="custom-range">
            <label className="field">
              <span>From</span>
              <DatePicker label="From date" value={customFrom} onChange={setCustomFrom} />
            </label>
            <label className="field">
              <span>To</span>
              <DatePicker label="To date" value={customTo} onChange={setCustomTo} />
            </label>
          </div>
        ) : null}

        <p className="range-label">
          {range.from === range.to
            ? formatNotebook(range.from)
            : `${formatNotebook(range.from)} – ${formatNotebook(range.to)}`}
        </p>

        <div className="view-toggle" role="group" aria-label="Report layout">
          <button type="button" className={view === "day" ? "chip on" : "chip"} onClick={() => setView("day")}>
            By day
          </button>
          <button type="button" className={view === "man" ? "chip on" : "chip"} onClick={() => setView("man")}>
            By delivery man
          </button>
        </div>

        {status === "error" ? <p className="form-error">Could not open the saved deliveries on this device.</p> : null}
        {!current && status !== "error" ? <p className="muted">Loading…</p> : null}
        {current && entries.length === 0 ? <p className="empty">No deliveries in these dates.</p> : null}

        {current && entries.length > 0 && view === "day" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {CYLINDERS.map((cylinder) => (
                    <th key={cylinder.id}>{cylinder.short}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{formatNotebook(day.date)}</th>
                    {CYLINDERS.map((cylinder) => (
                      <td key={cylinder.id} className={day.counts[cylinder.id] ? "" : "zero"}>
                        {day.counts[cylinder.id]}
                      </td>
                    ))}
                    <td>{totalOf(day.counts)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {CYLINDERS.map((cylinder) => (
                    <td key={cylinder.id}>{totals[cylinder.id]}</td>
                  ))}
                  <td>
                    <span className="badge total">{totalOf(totals)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}

        {current && entries.length > 0 && view === "man" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Delivery man</th>
                  {CYLINDERS.map((cylinder) => (
                    <th key={cylinder.id}>{cylinder.short}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {men.map((man) => (
                  <tr key={man.id}>
                    <th scope="row">{man.name}</th>
                    {CYLINDERS.map((cylinder) => (
                      <td key={cylinder.id} className={man.counts[cylinder.id] ? "" : "zero"}>
                        {man.counts[cylinder.id]}
                      </td>
                    ))}
                    <td>{totalOf(man.counts)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {CYLINDERS.map((cylinder) => (
                    <td key={cylinder.id}>{totals[cylinder.id]}</td>
                  ))}
                  <td>
                    <span className="badge total">{totalOf(totals)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </div>
      {current ? <ShareBar counts={totals} text={text} disabled={entries.length === 0} /> : null}
    </div>
  )
}
