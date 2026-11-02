import { useMemo, useState, type FormEvent } from "react"
import { Check, Minus, Plus, Trash2 } from "lucide-react"
import { CYLINDERS, cleanName, nameKey, type Cylinder } from "../cylinders"
import type { Counts, CylinderId, DayEntry, DeliveryMan } from "../types"
import { saveDelivery, deleteEntry } from "../db"
import { Dialog } from "./Dialog"

type EntryDialogProps = {
  date: string
  dateLabel: string
  entry: DayEntry | null
  men: DeliveryMan[]
  entries: DayEntry[]
  onClose: () => void
  onSaved: () => void
}

function rawFromCounts(counts: Counts | undefined): Record<CylinderId, string> {
  const raw = {} as Record<CylinderId, string>
  for (const cylinder of CYLINDERS) raw[cylinder.id] = counts ? String(counts[cylinder.id] || 0) : "0"
  return raw
}

function parseRaw(raw: Record<CylinderId, string>): Counts {
  const counts = {} as Counts
  for (const cylinder of CYLINDERS) {
    const value = Number(raw[cylinder.id] || "0")
    counts[cylinder.id] = Number.isInteger(value) && value > 0 ? value : 0
  }
  return counts
}

export function EntryDialog({ date, dateLabel, entry, men, entries, onClose, onSaved }: EntryDialogProps) {
  const [name, setName] = useState(entry?.deliveryManName ?? "")
  const [raw, setRaw] = useState(() => rawFromCounts(entry?.counts))
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const match = useMemo(() => {
    const key = nameKey(name)
    if (!key) return undefined
    return men.find((man) => nameKey(man.name) === key)
  }, [men, name])

  function setCylinder(id: CylinderId, value: string) {
    const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 5)
    setRaw((current) => ({ ...current, [id]: digits }))
  }

  function step(id: CylinderId, delta: number) {
    setRaw((current) => {
      const next = Math.min(99999, Math.max(0, Number(current[id] || "0") + delta))
      return { ...current, [id]: String(next) }
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setBusy(true)
    try {
      await saveDelivery({
        date,
        name,
        counts: parseRaw(raw),
        entryId: entry?.id,
      })
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save")
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!entry) return
    setBusy(true)
    try {
      await deleteEntry(entry.id)
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete")
      setBusy(false)
    }
  }

  const replacing = entries.some((row) => match && row.deliveryManId === match.id && row.id !== entry?.id)
  const hint = !cleanName(name)
    ? "Type a name. A new one is saved as a delivery man."
    : replacing
      ? "This replaces his entry for this day."
      : match
        ? match.active
          ? "Saved delivery man."
          : "This man was hidden. Saving brings him back."
        : "New name. He will be added to delivery men."

  return (
    <Dialog title={entry ? "Edit delivery" : "Add delivery"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="dialog-date">{dateLabel}</p>
        <label className="field">
          <span>Delivery man</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            list="delivery-men"
            autoComplete="off"
            spellCheck={false}
            required
            placeholder="Name"
          />
        </label>
        <datalist id="delivery-men">
          {men
            .filter((man) => man.active)
            .map((man) => (
              <option key={man.id} value={man.name} />
            ))}
        </datalist>
        <p className="hint">{hint}</p>

        <div className="count-list">
          {CYLINDERS.map((cylinder) => (
            <CountRow
              key={cylinder.id}
              cylinder={cylinder}
              value={raw[cylinder.id]}
              onChange={(value) => setCylinder(cylinder.id, value)}
              onStep={(delta) => step(cylinder.id, delta)}
            />
          ))}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {confirmDelete ? (
          <div className="confirm">
            <p>Delete this delivery for {entry?.deliveryManName}?</p>
            <div className="row-actions">
              <button type="button" className="btn secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Keep
              </button>
              <button type="button" className="btn danger" onClick={onDelete} disabled={busy}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="dialog-actions">
            {entry ? (
              <button type="button" className="btn ghost" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 size={16} />
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="row-actions">
              <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={busy || !cleanName(name)}>
                <Check size={16} />
                Save
              </button>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  )
}

function CountRow({
  cylinder,
  value,
  onChange,
  onStep,
}: {
  cylinder: Cylinder
  value: string
  onChange: (value: string) => void
  onStep: (delta: number) => void
}) {
  return (
    <div className="count-row">
      <span id={`label-${cylinder.id}`}>{cylinder.label}</span>
      <div className="stepper">
        <button type="button" className="icon-btn" aria-label={`Decrease ${cylinder.label}`} onClick={() => onStep(-1)}>
          <Minus size={16} />
        </button>
        <input
          aria-labelledby={`label-${cylinder.id}`}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" className="icon-btn" aria-label={`Increase ${cylinder.label}`} onClick={() => onStep(1)}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
