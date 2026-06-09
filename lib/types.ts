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
  ownerEmail?: string
  entryAt: number // timestamp
  note?: string
  services: ServiceItem[]
  parts: PartItem[]
}

// تایپ‌های API
export interface ApiCarOwnerProfile {
  first_name: string
  last_name: string
  email: string
}

export interface ApiCarOwner {
  id: string
  phone: string
  profile: ApiCarOwnerProfile | null
}

export interface ApiCarModel {
  id: number
  make: string
  model: string
  model_year: number
  transmission_type: string
}

export interface ApiCar {
  id: number
  owner: ApiCarOwner
  model: ApiCarModel
  manufacturing_year: number
  last_mileage: number
  plate_first: number
  plate_letter: string
  plate_second: number
  plate_region: number
  plate_number: string
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
