import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { monthTitle, parseISO, shiftMonth, todayISO, weekday } from "../cylinders"

type DatePickerProps = {
  value: string
  onChange: (iso: string) => void
  label?: string
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function monthCells(anchor: string): { iso: string; inMonth: boolean; day: number }[] {
  const date = parseISO(anchor)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(1 - startOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const month = String(day.getMonth() + 1).padStart(2, "0")
    const dateNum = String(day.getDate()).padStart(2, "0")
    return {
      iso: `${day.getFullYear()}-${month}-${dateNum}`,
      inMonth: day.getMonth() === date.getMonth(),
      day: day.getDate(),
    }
  })
}

export function DatePicker({ value, onChange, label = "Choose date" }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(value)
  const [box, setBox] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const today = todayISO()

  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 292
    const height = 332
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
    const below = rect.bottom + 8
    const top = below + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : below
    setCursor(value)
    setBox({ top, left })
    setOpen(true)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="date-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <Calendar size={16} />
        <span>
          <span className="date-trigger-main">{formatDay(value)}</span>
          <span className="date-trigger-sub">{weekday(value)}</span>
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              className="calendar"
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              style={{ top: box.top, left: box.left }}
            >
              <div className="cal-head">
                <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setCursor(shiftMonth(cursor, -1))}>
                  <ChevronLeft size={16} />
                </button>
                <p id={titleId}>{monthTitle(cursor)}</p>
                <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setCursor(shiftMonth(cursor, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="cal-week">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="cal-grid">
                {monthCells(cursor).map((cell) => {
                  const selected = cell.iso === value
                  const isToday = cell.iso === today
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      className={["cal-day", cell.inMonth ? "" : "out", selected ? "on" : "", isToday && !selected ? "today" : ""].filter(Boolean).join(" ")}
                      onClick={() => {
                        onChange(cell.iso)
                        setOpen(false)
                      }}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function formatDay(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
