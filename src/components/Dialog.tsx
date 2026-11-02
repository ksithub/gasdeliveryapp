import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

type DialogProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Dialog({ title, onClose, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const field = panel?.querySelector<HTMLElement>("input, textarea, select")
    ;(field ?? panel?.querySelector<HTMLElement>("button"))?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== "Tab" || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>("input, button, select, textarea")].filter(
        (item) => !item.hasAttribute("disabled") && item.tabIndex !== -1,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previous?.focus()
    }
  }, [])

  return (
    <div className="overlay" onMouseDown={() => closeRef.current()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => closeRef.current()}>
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
