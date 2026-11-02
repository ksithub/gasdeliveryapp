import { useEffect, useState, type FormEvent } from "react"
import { Check, EyeOff, Pencil, Plus, RotateCcw, User } from "lucide-react"
import { cleanName, nameKey } from "../cylinders"
import { addMan, hideMan, listMen, renameMan, restoreMan } from "../db"
import { useRefresh } from "../refresh"
import type { DeliveryMan } from "../types"
import { Dialog } from "./Dialog"

export function MenPanel() {
  const { tick, refresh } = useRefresh()
  const [men, setMen] = useState<DeliveryMan[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [editor, setEditor] = useState<{ id?: string; name: string } | null>(null)
  const [hiding, setHiding] = useState<DeliveryMan | null>(null)

  useEffect(() => {
    let cancelled = false
    listMen()
      .then((rows) => {
        if (cancelled) return
        setMen(rows)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  const active = men.filter((man) => man.active)
  const hidden = men.filter((man) => !man.active)

  return (
    <div className="panel">
      <div className="panel-body">
        <div className="toolbar">
          <h1 className="screen-title">Delivery men</h1>
          <button type="button" className="btn" onClick={() => setEditor({ name: "" })}>
            <Plus size={16} />
            Add
          </button>
        </div>
        <p className="hint">A new name typed on a delivery is added here automatically.</p>

        {status === "error" ? <p className="form-error">Could not open the saved names on this device.</p> : null}
        {status === "loading" ? <p className="muted">Loading…</p> : null}
        {status === "ready" && active.length === 0 ? (
          <p className="empty">No delivery men yet. Add one, or type a new name when you record a delivery.</p>
        ) : null}

        <ul className="man-list">
          {active.map((man) => (
            <li key={man.id} className="card man-row">
              <span className="avatar" aria-hidden="true">
                <User size={16} />
              </span>
              <span className="entry-name">{man.name}</span>
              <span className="row-actions">
                <button type="button" className="btn secondary slim" onClick={() => setEditor({ id: man.id, name: man.name })}>
                  <Pencil size={14} />
                  Rename
                </button>
                <button type="button" className="btn ghost slim" onClick={() => setHiding(man)}>
                  <EyeOff size={14} />
                  Hide
                </button>
              </span>
            </li>
          ))}
        </ul>

        {hidden.length > 0 ? (
          <section className="hidden-block">
            <h2>Hidden</h2>
            <ul className="man-list">
              {hidden.map((man) => (
                <li key={man.id} className="card man-row">
                  <span className="avatar muted" aria-hidden="true">
                    <User size={16} />
                  </span>
                  <span className="entry-name muted-name">{man.name}</span>
                  <button
                    type="button"
                    className="btn secondary slim"
                    onClick={() => {
                      void restoreMan(man.id).then(refresh)
                    }}
                  >
                    <RotateCcw size={14} />
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {editor ? (
        <ManDialog
          initial={editor}
          men={men}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            refresh()
          }}
        />
      ) : null}

      {hiding ? (
        <Dialog title="Hide delivery man" onClose={() => setHiding(null)}>
          <p className="hint">
            Hide {hiding.name}? Past days keep his name and counts. He drops off the list for new deliveries.
          </p>
          <div className="dialog-actions end">
            <button type="button" className="btn secondary" onClick={() => setHiding(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void hideMan(hiding.id).then(() => {
                  setHiding(null)
                  refresh()
                })
              }}
            >
              Hide
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}

function ManDialog({
  initial,
  men,
  onClose,
  onSaved,
}: {
  initial: { id?: string; name: string }
  men: DeliveryMan[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const clean = cleanName(name)
    if (!clean) {
      setError("Enter a name")
      return
    }
    const key = nameKey(clean)
    const clash = men.find((man) => man.id !== initial.id && nameKey(man.name) === key && man.active)
    if (clash) {
      setError("That name is already used")
      return
    }
    setBusy(true)
    try {
      if (initial.id) await renameMan(initial.id, clean)
      else await addMan(clean)
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save")
      setBusy(false)
    }
  }

  return (
    <Dialog title={initial.id ? "Rename delivery man" : "Add delivery man"} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" spellCheck={false} required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions end">
          <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy || !cleanName(name)}>
            <Check size={16} />
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}
