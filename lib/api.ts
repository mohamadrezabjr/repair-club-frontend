import type { ApiCar, ApiCarModel, ApiUser } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

export async function fetchCars(): Promise<ApiCar[]> {
  if (!BASE_URL) return []
  try {
    const res = await fetch(`${BASE_URL}/service/cars`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

export async function fetchModels(): Promise<ApiCarModel[]> {
  if (!BASE_URL) return []
  try {
    const res = await fetch(`${BASE_URL}/service/models`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch {
    return []
  }
}

export interface CreateCarPayload {
  owner?: string
  model: number
  manufacturing_year?: number
  last_mileage?: number
  plate_first: number
  plate_letter: string
  plate_second: number
  plate_region: number
}

export async function createCar(body: CreateCarPayload): Promise<ApiCar> {
  const res = await fetch(`${BASE_URL}/service/cars`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("خطا در ایجاد خودرو")
  return res.json()
}

export interface UpdateCarPayload {
  manufacturing_year?: number
  last_mileage?: number
  model?: number
}

export async function updateCar(id: number, body: UpdateCarPayload): Promise<ApiCar> {
  const res = await fetch(`${BASE_URL}/service/cars/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("خطا در به‌روزرسانی خودرو")
  return res.json()
}

export async function createModel(body: Omit<ApiCarModel, "id">): Promise<ApiCarModel> {
  const res = await fetch(`${BASE_URL}/service/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("خطا در ایجاد مدل")
  return res.json()
}

export async function updateModel(id: number, body: Partial<Omit<ApiCarModel, "id">>): Promise<ApiCarModel> {
  const res = await fetch(`${BASE_URL}/service/models/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("خطا در به‌روزرسانی مدل")
  return res.json()
}

// جستجوی یوزر با شماره — اگه پیدا نشد null برمی‌گردونه
export async function fetchUserByPhone(phone: string): Promise<ApiUser | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/service/users?phone=${encodeURIComponent(phone)}`, { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    // ممکنه آرایه بیاد یا تک آبجکت
    if (Array.isArray(data)) return data.length > 0 ? data[0] : null
    return data ?? null
  } catch {
    return null
  }
}

export interface CreateUserPayload {
  phone: string
  first_name?: string
  last_name?: string
  email?: string
}

export async function createUser(body: CreateUserPayload): Promise<ApiUser> {
  const res = await fetch(`${BASE_URL}/service/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("خطا در ایجاد کاربر")
  return res.json()
}

export async function createVisit(carId: number, description: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/service/visits/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ car: carId, description }),
  })
  if (!res.ok) throw new Error("خطا در ثبت ویزیت")
  return res.json()
}
