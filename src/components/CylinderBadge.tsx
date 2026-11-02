import { Cylinder, Wifi } from "lucide-react"
import { CYLINDERS } from "../cylinders"
import type { Counts, CylinderId } from "../types"

export function CylinderBadges({ counts }: { counts: Counts }) {
  return (
    <div className="badges">
      {CYLINDERS.map((cylinder) => {
        const count = counts[cylinder.id]
        return (
          <span key={cylinder.id} className={count ? "badge" : "badge zero"}>
            <CylinderMark id={cylinder.id} />
            <span>
              {cylinder.label}: <strong>{count}</strong>
            </span>
          </span>
        )
      })}
    </div>
  )
}

function CylinderMark({ id }: { id: CylinderId }) {
  if (id === "19online") return <Wifi size={14} aria-hidden="true" />
  return <Cylinder size={14} aria-hidden="true" />
}
