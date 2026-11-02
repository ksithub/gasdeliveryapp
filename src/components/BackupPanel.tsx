import { useState } from "react"
import { Download, Upload } from "lucide-react"
import { exportBackup, importBackup, isBackupFile } from "../db"
import { useRefresh } from "../refresh"
import type { BackupFile } from "../types"
import { Dialog } from "./Dialog"

export function BackupPanel() {
  const { refresh } = useRefresh()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState<BackupFile | null>(null)

  async function download() {
    setError("")
    const file = await exportBackup()
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const day = file.exportedAt.slice(0, 10)
    link.href = url
    link.download = `gas-delivery-${day}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`Saved ${file.men.length} delivery men and ${file.entries.length} deliveries.`)
  }

  async function onFile(file: File | undefined) {
    setError("")
    setMessage("")
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isBackupFile(parsed)) {
        setError("That file is not a gas delivery backup.")
        return
      }
      setPending(parsed)
    } catch {
      setError("That file is not a gas delivery backup.")
    }
  }

  return (
    <div className="panel">
      <div className="panel-body">
        <h1 className="screen-title">Backup</h1>
        <p className="hint">
          Deliveries stay on this phone or computer. Download a file so a reset does not wipe the book. Restoring replaces what is here now.
        </p>
        <div className="backup-actions">
          <button type="button" className="btn" onClick={() => void download()}>
            <Download size={16} />
            Download backup
          </button>
          <label className="btn secondary file-btn">
            <Upload size={16} />
            Restore from file
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const input = event.currentTarget
                void onFile(input.files?.[0])
                input.value = ""
              }}
            />
          </label>
        </div>
        {message ? <p className="hint">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      {pending ? (
        <Dialog title="Replace saved data" onClose={() => setPending(null)}>
          <p className="hint">
            Replace everything on this device with {pending.men.length} delivery men and {pending.entries.length} deliveries?
          </p>
          <div className="dialog-actions end">
            <button type="button" className="btn secondary" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void importBackup(pending).then(() => {
                  setPending(null)
                  setMessage("Backup restored.")
                  refresh()
                })
              }}
            >
              Replace
            </button>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
