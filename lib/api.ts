import type { ApiCar, ApiCarModel, ApiUser, ApiVisit, Service, ServiceOrder, ServiceOrderStatus, Product, ProductType, VisitStatus } from "@/lib/types"
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

/** دریافت لیست سرویس‌های پایه */
export async function fetchServices(): Promise<Service[]> {
  try {
    const { data } = await http.get<Service[]>("garage/services/")
    return data
  } catch {
    return []
  }
}

/** دریافت لیست محصولات/قطعات */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const { data } = await http.get<Product[]>("garage/products/")
    return data
  } catch {
    return []
  }
}

/** دریافت لیست انواع محصول */
export async function fetchProductTypes(): Promise<ProductType[]> {
  try {
    const { data } = await http.get<ProductType[]>("garage/product-types/")
    return data
  } catch {
    return []
  }
}

// ─── Mega Visit Payload ──────────────────────────────────────────────────────

/** طبق قانون sanitize: اگه موجود → فقط {id}؛ اگه جدید → دیتای کامل بدون id */
export type MegaCarModelPayload =
  | { id: number }
  | { make: string; model: string; model_year: number; transmission_type: string }

export type MegaCarPayload =
  | { id: number }
  | {
      owner?: string // شماره تلفن (اختیاری)
      model: MegaCarModelPayload
      manufacturing_year?: number
      in_garage: boolean
      last_mileage?: number
      plate_first: number
      plate_letter: string
      plate_second: number
      plate_region: number
    }

export type MegaProductTypePayload =
  | { id: number }
  | { name: string; description?: string }

export type MegaProductPayload =
  | { id: number }
  | { name: string; price: number; stock?: number; description?: string; product_type: MegaProductTypePayload }

export type MegaServicePayload =
  | { id: number }
  | {
      title: string
      description?: string
      base_price?: number
      mileage_interval?: number
      products_needed?: MegaProductPayload[]
    }

export interface MegaServiceOrderPayload {
  service: MegaServicePayload
  title?: string
  extra_description?: string
  price: number
  status: ServiceOrderStatus
}

export interface MegaProductOrderPayload {
  quantity: number
  product: MegaProductPayload
}

export interface MegaVisitPayload {
  car: MegaCarPayload
  service_orders: MegaServiceOrderPayload[]
  product_orders: MegaProductOrderPayload[]
  status: VisitStatus
  description?: string
}

/** ارسال کل ویزیت به صورت یک payload به /garage/visits/ */
export async function createVisitMega(payload: MegaVisitPayload): Promise<ApiVisit> {
  const { data } = await http.post<ApiVisit>("garage/visits/", payload)
  return data
}

// ─── Service Orders ──────────────────────────────────────────────────────────

/** پیلود سرویس داخل یک service_order */
export type ServicePayload =
  | { id: number }                                              // سرویس موجود
  | {                                                           // سرویس جدید
      id: null
      title: string
      description?: string | null
      base_price?: number | null
      mileage_interval?: number | null
      car_model?: number | null
      products_needed?: number[]
    }

export interface ServiceOrderPayload {
  id: number | null
  service: ServicePayload
  title?: string | null
  extra_description?: string | null
  price: number
  status: ServiceOrderStatus
}

/**
 * افزودن/ویرایش سرویس‌های یک ویزیت
 * POST garage/visits/<visit_id>/service_orders/
 * پاسخ: ویزیت به‌روزشده
 */
export async function saveServiceOrders(
  visitId: number,
  serviceOrders: ServiceOrderPayload[],
): Promise<ApiVisit> {
  const { data } = await http.post<ApiVisit>(
    `garage/visits/${visitId}/service_orders/`,
    { service_orders: serviceOrders },
  )
  return data
}

/**
 * تغییر وضعیت یک سرویس‌اوردر
 * PATCH garage/visits/<visit_id>/service_orders/<order_id>/
 */
export async function updateServiceOrderStatus(
  visitId: number,
  orderId: number,
  status: ServiceOrderStatus,
): Promise<ServiceOrder> {
  const { data } = await http.patch<ServiceOrder>(
    `garage/service_orders/${orderId}/`,
    { status },
  )
  return data
}

/**
 * حذف یک سرویس‌اوردر
 * DELETE garage/visits/<visit_id>/service_orders/<order_id>/
 */
export async function deleteServiceOrder(
  visitId: number,
  orderId: number,
): Promise<void> {
  await http.delete(`garage/service_orders/${orderId}/`)
}
