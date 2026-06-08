import type { ApiCar, ApiCarModel } from "@/lib/types"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

export async function fetchCars(): Promise<ApiCar[]> {
  const res = await fetch(`${BASE_URL}/service/cars`, { cache: "no-store" })
  if (!res.ok) throw new Error("خطا در دریافت لیست خودروها")
  return res.json()
}

export async function fetchModels(): Promise<ApiCarModel[]> {
  const res = await fetch(`${BASE_URL}/service/models`, { cache: "no-store" })
  if (!res.ok) throw new Error("خطا در دریافت لیست مدل‌ها")
  return res.json()
}

export async function createCar(body: Partial<ApiCar>): Promise<ApiCar> {
  const res = await fetch(`${BASE_URL}/service/cars`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("خطا در ایجاد خودرو")
  return res.json()
}

export async function updateCar(id: number, body: Partial<ApiCar>): Promise<ApiCar> {
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
