import { useState } from "react"
import { Check, Copy, MessageCircle } from "lucide-react"
import { totalOf } from "../cylinders"
import type { Counts } from "../types"
import { whatsappUrl } from "../whatsapp"
import { CylinderBadges } from "./CylinderBadge"

type ShareBarProps = {
  counts: Counts
  text: string
  disabled?: boolean
}

export function ShareBar({ counts, text, disabled }: ShareBarProps) {
  const [copied, setCopied] = useState(false)
  const all = totalOf(counts)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement("textarea")
      area.value = text
      area.setAttribute("readonly", "true")
      area.style.position = "fixed"
      area.style.left = "-9999px"
      document.body.appendChild(area)
      area.select()
      document.execCommand("copy")
      area.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer className="dock">
      <CylinderBadges counts={counts} />
      <div className="share-row">
        <p className="grand">
          All cylinders <span className="badge total">{all}</span>
        </p>
        <button type="button" className="btn secondary" onClick={copy} disabled={disabled}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          className={disabled ? "btn share disabled" : "btn share"}
          href={disabled ? undefined : whatsappUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={disabled || undefined}
          onClick={(event) => {
            if (disabled) event.preventDefault()
          }}
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>
      </div>
    </footer>
  )
}
