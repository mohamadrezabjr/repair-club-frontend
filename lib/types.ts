// ─── Union types ──────────────────────────────────────────────────────────────

export type TransmissionType = "auto" | "man"
export type ServiceOrderStatus = "pending" | "in-progress" | "done"
export type VisitStatus = "ready" | "queued" | "repairing" | "delivered" | "cancelled"
export type UserRole = "admin" | "user"
export type PlateLetter =
  | "الف"
  | "ب"
  | "پ"
  | "ت"
  | "ث"
  | "ج"
  | "د"
  | "س"
  | "ص"
  | "ط"
  | "ع"
  | "ق"
  | "ل"
  | "م"
  | "ن"
  | "و"
  | "ه"
  | "ی"

// ─── Core domain entities (official definitions) ───────────────────────────────

export interface UserProfile {
  id?: number
  first_name: string | null
  last_name: string | null
  email: string | null
}

export interface User {
  id: string
  phone: string
  profile: UserProfile | null
  role: UserRole
}

export interface CarModel {
  id: number
  make: string | null
  model: string
  model_year: number | null
  transmission_type: TransmissionType | null
}

export interface Car {
  id: number
  owner: User | null
  model: CarModel | null
  manufacturing_year: number | null
  registration_date: string
  in_garage: boolean
  last_visit_date: string | null
  last_mileage: number | null
  plate_first: number
  plate_letter: PlateLetter
  plate_second: number
  plate_region: number
  plate_number: string
}

export interface ProductType {
  id: number
  name: string
  description: string | null
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  product_type: ProductType | null
  stock: number
  created_at: string
  updated_at: string
}

export interface ProductOrder {
  id: number
  product: Product | null
  created_at: string
  updated_at: string
  quantity: number
  total_price: number
}

export interface Service {
  id: number
  title: string
  description: string | null
  car_model: CarModel | null
  base_price: number | null
  products_needed: number[]
  mileage_interval: number | null
}

export interface ServiceOrder {
  id: number
  title: string | null
  service: Service | null
  extra_description: string | null
  price: number
  status: ServiceOrderStatus
  created_at: string
  updated_at: string
}

export interface Visit {
  id: number
  car: Car | null
  service_orders: ServiceOrder[]
  product_orders: ProductOrder[]
  status: VisitStatus
  created_at: string
  updated_at: string
  description: string | null
  is_ready?: boolean
}

// ─── Auth ───────────────────────────────────────────────────────────────────

/** کاربر احراز هویت‌شده — منطبق با تعریف رسمی User */
export type AuthUser = User

// ─── Backward-compatible aliases (legacy `Api*` names) ─────────────────────────

export type ApiCarOwnerProfile = UserProfile
export type ApiCarOwner = User
export type ApiUser = User
export type ApiCarModel = CarModel
export type ApiCar = Car
export type ApiServiceOrder = ServiceOrder
export type ApiProductOrder = ProductOrder
export type ApiVisit = Visit

// ─── پلاک ایرانی (برای کامپوننت LicensePlate) ──────────────────────────────────
// نمایش: ۱۲ ل ۳۴۵ ایران ۶۷
export interface Plate {
  twoDigits: string // دو رقم سمت چپ
  letter: string // حرف
  threeDigits: string // سه رقم
  region: string // کد شهر (دو رقم)
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

// تبدیل فیلدهای پلاک خودرو به شیء Plate برای کامپوننت LicensePlate
export function carToPlate(car: Car | null | undefined): Plate | null {
  if (!car) return null
  return {
    twoDigits: String(car.plate_first ?? ""),
    letter: car.plate_letter ?? "ب",
    threeDigits: String(car.plate_second ?? ""),
    region: String(car.plate_region ?? ""),
  }
}
