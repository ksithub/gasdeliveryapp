import { CYLINDERS, formatNotebook, groupByDate, groupByMan, inlineCounts, sumCounts, totalOf, weekday } from "./cylinders"
import type { Counts, DayEntry } from "./types"

function countLines(counts: Counts): string {
  const lines = CYLINDERS.filter((cylinder) => counts[cylinder.id] > 0).map(
    (cylinder) => `${cylinder.short}: ${counts[cylinder.id]}`,
  )
  return lines.length > 0 ? lines.join("\n") : "0"
}

function totalBlock(counts: Counts): string {
  return `*Total · ${totalOf(counts)}*\n${countLines(counts)}`
}

function personBlock(name: string, counts: Counts): string {
  return `*${name}* · ${totalOf(counts)}\n${countLines(counts)}`
}

function heading(from: string, to: string): string {
  if (from === to) return `*Gas delivery · ${formatNotebook(from)}*\n${weekday(from)}`
  return `*Gas delivery*\n${formatNotebook(from)} to ${formatNotebook(to)}`
}

export function dayMessage(date: string, entries: DayEntry[]): string {
  const sorted = entries.slice().sort((a, b) => a.deliveryManName.localeCompare(b.deliveryManName))
  const head = heading(date, date)
  if (sorted.length === 0) return `${head}\n\nNo deliveries`
  const people = sorted.map((entry) => personBlock(entry.deliveryManName, entry.counts)).join("\n\n")
  const total = sumCounts(sorted.map((entry) => entry.counts))
  return `${head}\n\n${people}\n\n${totalBlock(total)}`
}

export function rangeMessage(from: string, to: string, entries: DayEntry[]): string {
  const days = groupByDate(entries)
    .map((day) => `*${formatNotebook(day.date)}* · ${totalOf(day.counts)}\n${inlineCounts(day.counts) || "0"}`)
    .join("\n\n")
  const men = groupByMan(entries)
    .map((man) => `*${man.name}* · ${totalOf(man.counts)}\n${inlineCounts(man.counts) || "0"}`)
    .join("\n\n")
  const total = sumCounts(entries.map((entry) => entry.counts))
  return `${heading(from, to)}\n\n*By day*\n${days}\n\n*By delivery man*\n${men}\n\n${totalBlock(total)}`
}

export function menMessage(from: string, to: string, entries: DayEntry[]): string {
  const men = groupByMan(entries)
    .map((man) => personBlock(man.name, man.counts))
    .join("\n\n")
  const total = sumCounts(entries.map((entry) => entry.counts))
  return `${heading(from, to)}\n\n${men}\n\n${totalBlock(total)}`
}

export function reportMessage(
  view: "day" | "man",
  from: string,
  to: string,
  entries: DayEntry[],
): string {
  if (entries.length === 0) return `${heading(from, to)}\n\nNo deliveries`
  if (view === "man") return menMessage(from, to, entries)
  if (from === to) return dayMessage(from, entries)
  return rangeMessage(from, to, entries)
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
