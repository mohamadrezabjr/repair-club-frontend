export type ServiceStatus = "pending" | "in-progress" | "done"

export interface ServiceItem {
  id: string
  title: string
  description?: string
  status: ServiceStatus
  price: number
}

export interface PartItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

// پلاک ایرانی: ۱۲ ل ۳۴۵ ایران ۶۷
export interface Plate {
  twoDigits: string // دو رقم سمت چپ
  letter: string // حرف
  threeDigits: string // سه رقم
  region: string // کد شهر (دو رقم)
}

export interface Car {
  id: string
  plate: Plate
  brand: string
  model: string
  color: string
  year: string
  ownerName: string
  ownerPhone: string
  entryAt: number // timestamp
  note?: string
  services: ServiceItem[]
  parts: PartItem[]
}

export const PLATE_LETTERS = [
  "الف",
  "ب",
  "پ",
  "ت",
  "ث",
  "ج",
  "د",
  "ز",
  "ژ",
  "س",
  "ش",
  "ص",
  "ط",
  "ع",
  "ق",
  "ل",
  "م",
  "ن",
  "و",
  "ه",
  "ی",
  "معلولین",
]
