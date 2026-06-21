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

// تایپ‌های Auth
export interface AuthUser {
  id: string
  phone: string
  profile: { first_name: string; last_name: string; email: string }
  role: "admin" | "user"
}

// تایپ‌های API
export interface ApiUser {
  id: string
  phone: string
  profile: ApiCarOwnerProfile | null
}

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
  owner: ApiCarOwner | null
  model: ApiCarModel | null
  manufacturing_year: number
  last_mileage: number
  plate_first: number
  plate_letter: string
  plate_second: number
  plate_region: number
  plate_number: string
}

// ---- Visit / Garage API types ----

export type VisitStatus = "queued" | "repairing" | "ready" | "delivered" | "cancelled"

export interface ApiServiceOrder {
  id: number
  /** عنوان اصلی سرویس که باید در UI نمایش داده شود */
  title: string
  price: number
  status: string
}

export interface ApiVisitCar {
  id: number
  model: {
    make: string
    model: string
    model_year: number
  }
  plate_number: string
}

export interface ApiVisit {
  id: number
  car: ApiVisitCar
  service_orders: ApiServiceOrder[]
  status: VisitStatus
  created_at: string
}

// ---- end Visit types ----

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
