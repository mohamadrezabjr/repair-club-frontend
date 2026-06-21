import type { ApiCar, ApiCarModel, ApiUser, ApiVisit } from "@/lib/types"
import { http } from "@/lib/http"

export async function fetchCars(): Promise<ApiCar[]> {
  try {
    const { data } = await http.get<ApiCar[]>("garage/cars/")
    return data
  } catch {
    return []
  }
}

export async function fetchModels(): Promise<ApiCarModel[]> {
  try {
    const { data } = await http.get<ApiCarModel[]>("garage/models/")
    return data
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
  const { data } = await http.post<ApiCar>("garage/cars/", body)
  return data
}

export interface UpdateCarPayload {
  manufacturing_year?: number
  last_mileage?: number
  model?: number
}

export async function updateCar(id: number, body: UpdateCarPayload): Promise<ApiCar> {
  const { data } = await http.patch<ApiCar>(`garage/cars/${id}`, body)
  return data
}

export async function createModel(body: Omit<ApiCarModel, "id">): Promise<ApiCarModel> {
  const { data } = await http.post<ApiCarModel>("garage/models/", body)
  return data
}

export async function updateModel(id: number, body: Partial<Omit<ApiCarModel, "id">>): Promise<ApiCarModel> {
  const { data } = await http.patch<ApiCarModel>(`garage/models/${id}`, body)
  return data
}

// جستجوی یوزر با شماره — اگه پیدا نشد null برمی‌گردونه
export async function fetchUserByPhone(phone: string): Promise<ApiUser | null> {
  try {
    const { data } = await http.get<ApiUser | ApiUser[]>(`service/users`, {
      params: { phone },
    })
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
  const { data } = await http.post<ApiUser>("service/users", body)
  return data
}

export async function createVisit(carId: number, description: string): Promise<unknown> {
  const { data } = await http.post<unknown>("garage/visits/", {
    car: carId,
    description,
  })
  return data
}

/** دریافت تمام ویزیت‌ها از API */
export async function fetchVisits(): Promise<ApiVisit[]> {
  try {
    const { data } = await http.get<ApiVisit[]>("garage/visits/")
    return data
  } catch {
    return []
  }
}
