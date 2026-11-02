import type { Counts, CylinderId, DayEntry } from "./types"

export type Cylinder = {
  id: CylinderId
  label: string
  short: string
}

export const CYLINDERS: readonly Cylinder[] = [
  { id: "14.2", label: "14.2 KG", short: "14.2 KG" },
  { id: "10", label: "10 KG", short: "10 KG" },
  { id: "5", label: "5 KG", short: "5 KG" },
  { id: "19", label: "19 KG", short: "19 KG" },
  { id: "19online", label: "19 KG Online", short: "19 KG Online" },
]

export function emptyCounts(): Counts {
  return { "14.2": 0, "10": 0, "5": 0, "19": 0, "19online": 0 }
}

export function sanitizeCounts(input: Partial<Counts> | undefined): Counts {
  const counts = emptyCounts()
  if (!input) return counts
  for (const cylinder of CYLINDERS) {
    const value = Number(input[cylinder.id])
    counts[cylinder.id] = Number.isInteger(value) && value > 0 ? Math.min(value, 99999) : 0
  }
  return counts
}

export function totalOf(counts: Counts): number {
  return CYLINDERS.reduce((sum, cylinder) => sum + (counts[cylinder.id] || 0), 0)
}

export function sumCounts(rows: Counts[]): Counts {
  const total = emptyCounts()
  for (const row of rows) {
    for (const cylinder of CYLINDERS) total[cylinder.id] += row[cylinder.id] || 0
  }
  return total
}

export function inlineCounts(counts: Counts): string {
  return CYLINDERS.filter((cylinder) => counts[cylinder.id] > 0)
    .map((cylinder) => `${cylinder.short}: ${counts[cylinder.id]}`)
    .join(", ")
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

export function nameKey(name: string): string {
  return cleanName(name).toLocaleLowerCase()
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso)
  date.setDate(date.getDate() + days)
  return todayISO(date)
}

export function shiftMonth(iso: string, delta: number): string {
  const date = parseISO(iso)
  return todayISO(new Date(date.getFullYear(), date.getMonth() + delta, 1))
}

export function formatNotebook(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

export function weekday(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-GB", { weekday: "long" })
}

export function monthTitle(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

export type RangePreset = "today" | "yesterday" | "first-half" | "second-half" | "month" | "custom"

export function rangeFor(
  preset: RangePreset,
  anchor: string,
  custom: { from: string; to: string },
): { from: string; to: string } {
  if (preset === "today") return { from: anchor, to: anchor }
  if (preset === "yesterday") {
    const day = addDays(anchor, -1)
    return { from: day, to: day }
  }
  const date = parseISO(anchor)
  const year = date.getFullYear()
  const month = date.getMonth()
  if (preset === "first-half") {
    return { from: todayISO(new Date(year, month, 1)), to: todayISO(new Date(year, month, 15)) }
  }
  if (preset === "second-half") {
    return { from: todayISO(new Date(year, month, 16)), to: todayISO(new Date(year, month + 1, 0)) }
  }
  if (preset === "month") {
    return { from: todayISO(new Date(year, month, 1)), to: todayISO(new Date(year, month + 1, 0)) }
  }
  const from = custom.from || anchor
  const to = custom.to || anchor
  return from <= to ? { from, to } : { from: to, to: from }
}

export type DateGroup = { date: string; entries: DayEntry[]; counts: Counts }
export type ManGroup = { id: string; name: string; counts: Counts }

export function groupByDate(entries: DayEntry[]): DateGroup[] {
  const map = new Map<string, DayEntry[]>()
  for (const entry of entries) {
    const list = map.get(entry.date) ?? []
    list.push(entry)
    map.set(entry.date, list)
  }
  return [...map.keys()].sort().map((date) => {
    const rows = map.get(date)!.slice().sort(byManName)
    return { date, entries: rows, counts: sumCounts(rows.map((row) => row.counts)) }
  })
}

export function groupByMan(entries: DayEntry[]): ManGroup[] {
  const map = new Map<string, { name: string; counts: Counts[] }>()
  for (const entry of entries) {
    const current = map.get(entry.deliveryManId) ?? { name: entry.deliveryManName, counts: [] }
    current.name = entry.deliveryManName
    current.counts.push(entry.counts)
    map.set(entry.deliveryManId, current)
  }
  return [...map.entries()]
    .map(([id, value]) => ({ id, name: value.name, counts: sumCounts(value.counts) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function byManName(a: DayEntry, b: DayEntry): number {
  return a.deliveryManName.localeCompare(b.deliveryManName)
}
