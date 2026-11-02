import Dexie, { type Table } from "dexie"
import { cleanName, nameKey, sanitizeCounts } from "./cylinders"
import type { BackupFile, Counts, DayEntry, DeliveryMan } from "./types"

type GasDatabase = Dexie & {
  men: Table<DeliveryMan, string>
  entries: Table<DayEntry, string>
}

export const db = new Dexie("gas-delivery") as GasDatabase

db.version(1).stores({
  men: "id, active",
  entries: "id, date, deliveryManId, [date+deliveryManId]",
})

function newId(): string {
  return crypto.randomUUID()
}

export async function listMen(): Promise<DeliveryMan[]> {
  const men = await db.men.toArray()
  return men.sort((a, b) => a.name.localeCompare(b.name))
}

export async function entriesOn(date: string): Promise<DayEntry[]> {
  const rows = await db.entries.where("date").equals(date).toArray()
  return rows.sort((a, b) => a.deliveryManName.localeCompare(b.deliveryManName))
}

export async function entriesBetween(from: string, to: string): Promise<DayEntry[]> {
  const rows = await db.entries.where("date").between(from, to, true, true).toArray()
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.deliveryManName.localeCompare(b.deliveryManName))
}

export async function saveDelivery(input: {
  date: string
  name: string
  counts: Counts
  entryId?: string
}): Promise<void> {
  const name = cleanName(input.name)
  if (!name) throw new Error("Enter a delivery man name")
  const counts = sanitizeCounts(input.counts)
  const key = nameKey(name)

  await db.transaction("rw", db.men, db.entries, async () => {
    const men = await db.men.toArray()
    let man = men.find((item) => nameKey(item.name) === key)
    if (!man) {
      man = { id: newId(), name, active: true, createdAt: Date.now() }
      await db.men.add(man)
    } else if (!man.active) {
      await db.men.update(man.id, { active: true })
      man = { ...man, active: true }
    }

    const existing = await db.entries.where("[date+deliveryManId]").equals([input.date, man.id]).first()
    if (input.entryId && existing && existing.id !== input.entryId) {
      await db.entries.delete(input.entryId)
    }

    const row: DayEntry = {
      id: existing?.id ?? input.entryId ?? newId(),
      date: input.date,
      deliveryManId: man.id,
      deliveryManName: man.name,
      counts,
      updatedAt: Date.now(),
    }
    await db.entries.put(row)
  })
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id)
}

export async function addMan(name: string): Promise<void> {
  const clean = cleanName(name)
  if (!clean) throw new Error("Enter a name")
  const key = nameKey(clean)
  const men = await db.men.toArray()
  const existing = men.find((man) => nameKey(man.name) === key)
  if (existing) {
    if (!existing.active) {
      await db.men.update(existing.id, { active: true, name: clean })
      return
    }
    throw new Error("That name is already used")
  }
  await db.men.add({ id: newId(), name: clean, active: true, createdAt: Date.now() })
}

export async function renameMan(id: string, name: string): Promise<void> {
  const clean = cleanName(name)
  if (!clean) throw new Error("Enter a name")
  const key = nameKey(clean)
  const men = await db.men.toArray()
  const clash = men.find((man) => man.id !== id && nameKey(man.name) === key)
  if (clash) throw new Error("That name is already used")
  await db.transaction("rw", db.men, db.entries, async () => {
    await db.men.update(id, { name: clean })
    const rows = await db.entries.where("deliveryManId").equals(id).toArray()
    await Promise.all(rows.map((row) => db.entries.update(row.id, { deliveryManName: clean })))
  })
}

export async function hideMan(id: string): Promise<void> {
  await db.men.update(id, { active: false })
}

export async function restoreMan(id: string): Promise<void> {
  await db.men.update(id, { active: true })
}

export async function exportBackup(): Promise<BackupFile> {
  const [men, entries] = await Promise.all([db.men.toArray(), db.entries.toArray()])
  return {
    app: "gas-delivery",
    version: 1,
    exportedAt: new Date().toISOString(),
    men,
    entries,
  }
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false
  const file = value as Partial<BackupFile>
  return file.app === "gas-delivery" && file.version === 1 && Array.isArray(file.men) && Array.isArray(file.entries)
}

export async function importBackup(file: BackupFile): Promise<void> {
  const men: DeliveryMan[] = []
  for (const man of file.men) {
    if (!man || typeof man.id !== "string" || typeof man.name !== "string") continue
    const name = cleanName(man.name)
    if (!name) continue
    men.push({
      id: man.id,
      name,
      active: man.active !== false,
      createdAt: typeof man.createdAt === "number" ? man.createdAt : Date.now(),
    })
  }

  const known = new Set(men.map((man) => man.id))
  const entries: DayEntry[] = []
  for (const entry of file.entries) {
    if (!entry || typeof entry.id !== "string" || typeof entry.date !== "string") continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue
    if (typeof entry.deliveryManId !== "string" || !known.has(entry.deliveryManId)) continue
    const man = men.find((item) => item.id === entry.deliveryManId)
    entries.push({
      id: entry.id,
      date: entry.date,
      deliveryManId: entry.deliveryManId,
      deliveryManName: cleanName(entry.deliveryManName) || man?.name || "Unknown",
      counts: sanitizeCounts(entry.counts),
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : Date.now(),
    })
  }

  await db.transaction("rw", db.men, db.entries, async () => {
    await db.entries.clear()
    await db.men.clear()
    await db.men.bulkPut(men)
    await db.entries.bulkPut(entries)
  })
}
