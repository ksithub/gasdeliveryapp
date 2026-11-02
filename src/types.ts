export type CylinderId = "14.2" | "10" | "5" | "19" | "19online"

export type Counts = Record<CylinderId, number>

export type DeliveryMan = {
  id: string
  name: string
  active: boolean
  createdAt: number
}

export type DayEntry = {
  id: string
  date: string
  deliveryManId: string
  deliveryManName: string
  counts: Counts
  updatedAt: number
}

export type BackupFile = {
  app: "gas-delivery"
  version: 1
  exportedAt: string
  men: DeliveryMan[]
  entries: DayEntry[]
}
