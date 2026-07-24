import type { ApiCar, ApiCarModel, ApiUser, ApiVisit, Product, ProductOrder, ProductType, Service, ServiceOrder, ServiceOrderStatus } from "@/lib/types"
import { http } from "@/lib/http"

// ─── Is In Garage ──────────────────────────────────────────────────────────

export interface IsInGaragePayload {
  plate_first: number
  plate_letter: string
  plate_second: number
  plate_region: number
}

export interface IsInGarageResponse {
  in_garage: boolean
  plate_first: number
  plate_letter: string
  plate_second: number
  plate_region: number
  active_visit: ApiVisit | null
}

/**
 * بررسی حضور ماشین در تعمیرگاه بر اساس پلاک
 * POST garage/cars/is_in_garage
 */
export async function checkIsInGarage(
  payload: IsInGaragePayload,
): Promise<IsInGarageResponse> {
  const { data } = await http.post<IsInGarageResponse>(
    "garage/cars/is_in_garage/",
    payload,
  )
  return data
}

// ─── Cars ────────────────────────────────────────────────────────────────────

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

// جستجوی یوزران با بخشی از شماره تلفن (برای اتوکامپلیت)
export async function searchUsersByPhone(phone: string): Promise<ApiUser[]> {
  try {
    const { data } = await http.get<ApiUser[]>(`auth/users/search-by-phone/${phone}/`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
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

// ─── Visits ─────────────────────────────────────────────────────────

/**
 * پیلود مدل در بادی ویزیت:
 * - اگر مدل موجود: { "id": 1 }
 * - اگر مدل جدید: { "id": null, "make": "...", "model": "...", ... }
 */
export type VisitCarModelPayload =
  | { id: number }
  | {
      id: null
      make: string
      model: string
      model_year: number | null
      transmission_type: "man" | "auto"
    }

/**
 * بادی برای ساخت ویزیت با ماشین (موجود یا جدید)
 * POST /garage/visits/
 */
export interface CreateVisitWithCarPayload {
  car: {
    id?: number | null              // اگر ماشین موجود باشد
    owner?: string | null           // UUID مالک (اختیاری - برای ماشین جدید)
    model: VisitCarModelPayload     // مدل موجود یا جدید
    manufacturing_year?: number | null
    in_garage?: boolean             // پیش‌فرض: true
    last_mileage?: number | null
    plate_first: number
    plate_letter: string
    plate_second: number
    plate_region: number
  }
  status?: "queued" | "repairing" | "ready" | "delivered" | "cancelled"
  description?: string | null
  current_mileage?: number | null
  next_mileage?: number | null
}

/**
 * ساخت ویزیت جدید با ماشین (موجود یا جدید)
 * POST /garage/visits/
 * - برای ماشین موجود: car.id تع��ین می‌شه و model.id و ... باقی فیلدها اختیاری
 * - برای ماشین جدید: car.id را اختیاری بگذار یا حذف کن، model با اطلاعات کامل و id: null
 */
export async function createVisitWithCar(
  payload: CreateVisitWithCarPayload,
): Promise<ApiVisit> {
  const { data } = await http.post<ApiVisit>("garage/visits/", payload)
  return data
}

/**
 * ساخت ویزیت ساده با carId موجود
 * @deprecated از createVisitWithCar استفاده کنید
 */
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
  staff?: number[]
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
 * ویرایش یک سرویس‌اوردر
 * PATCH garage/service_orders/<order_id>/
 */
export async function updateServiceOrder(
  orderId: number,
  body: Partial<{ title: string | null; price: number; status: ServiceOrderStatus; extra_description: string | null }>,
): Promise<ServiceOrder> {
  const { data } = await http.patch<ServiceOrder>(`garage/service_orders/${orderId}/`, body)
  return data
}

/**
 * ویرایش یک product_order
 * PATCH inventory/product_orders/<order_id>/
 */
export async function updateProductOrder(
  orderId: number,
  body: Partial<{ quantity: number }>,
): Promise<ProductOrder> {
  const { data } = await http.patch<ProductOrder>(`inventory/product_orders/${orderId}/`, body)
  return data
}

/**
 * آپدیت ویزیت (وضعیت، توضیحات، سرویس‌کاران، کیلومتر)
 * PATCH garage/visits/<visit_id>/
 */
export async function updateVisit(
  visitId: number,
  body: Partial<{ status: string; description: string | null; staff: number[]; current_mileage: number | null; next_mileage: number | null }>,
): Promise<ApiVisit> {
  const { data } = await http.patch<ApiVisit>(`garage/visits/${visitId}/`, body)
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

// ─── Products & Product Types ────────────────────────────────────────────────

/** دریافت لیست انواع کالا */
export async function fetchProductTypes(): Promise<ProductType[]> {
  try {
    const { data } = await http.get<ProductType[]>("inventory/product_types/")
    return data
  } catch {
    return []
  }
}

/** دریافت لیست محصولات */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const { data } = await http.get<Product[]>("inventory/products/")
    return data
  } catch {
    return []
  }
}

// ─── Product Orders payload types ────────────────────────────────────────────

/** پایلود product_type در بادی ساخت محصول */
export type ProductTypePayload =
  | { id: number }                  // نوع کالای موجود
  | { id: null; name: string; description?: string | null }  // نوع کالای جدید

/** پایلود product در بادی product_order */
export type ProductPayload =
  | { id: number }                  // محصول موجود
  | {                               // محصول جدید
      id: null
      product_type: ProductTypePayload
      name: string
      price: number
      stock?: number
      description?: string | null
    }

export interface ProductOrderPayload {
  product: ProductPayload
  quantity: number
}

// ─── Combined orders submit ───────────────────────────────────────────────────

export interface VisitOrdersPayload {
  service_orders?: ServiceOrderPayload[]
  product_orders?: ProductOrderPayload[]
}

/**
 * ثبت سرویس‌ها و کالاها به صورت هم‌زمان
 * POST visits/<visit_id>/orders/
 */
export async function submitVisitOrders(
  visitId: number,
  payload: VisitOrdersPayload,
): Promise<ApiVisit> {
  const { data } = await http.post<ApiVisit>(
    `garage/visits/${visitId}/orders/`,
    payload,
  )
  return data
}

/**
 * حذف یک product_order
 * DELETE inventory/product_orders/<order_id>/
 */
export async function deleteProductOrder(
  orderId: number,
): Promise<void> {
  await http.delete(`inventory/product_orders/${orderId}/`)
}

// ─── Visit Search ─────────────────────────────────────────────────────────────

export interface VisitSearchParams {
  plate_first?: string
  plate_letter?: string
  plate_second?: string
  plate_region?: string
  phone?: string
  date_from?: string
  date_to?: string
}

/**
 * جستجوی ویزیت‌ها بر اساس پلاک، شماره تلفن مالک، و بازه تاریخ
 * GET garage/visits/search/?plate_first=...&plate_letter=...&plate_second=...&plate_region=...&phone=...&date_from=...&date_to=...
 */
export async function searchVisits(params: VisitSearchParams): Promise<ApiVisit[]> {
  try {
    const { data } = await http.get<ApiVisit[]>("garage/visits/search/", { params })
    return data
  } catch {
    return []
  }
}

// ─── Staff ────────────────────────────────────────────────────────────────────

import type { Staff, StaffRole } from "@/lib/types"

/** دریافت لیست کارکنان فعال */
export async function fetchStaff(): Promise<Staff[]> {
  try {
    const { data } = await http.get<Staff[]>("garage/staff/")
    return data
  } catch {
    return []
  }
}

/** دریافت لیست نقش‌ها */
export async function fetchStaffRoles(): Promise<StaffRole[]> {
  try {
    const { data } = await http.get<StaffRole[]>("garage/staff/roles/")
    return data
  } catch {
    return []
  }
}

/** ساخت نقش جدید */
export async function createStaffRole(body: Partial<StaffRole>): Promise<StaffRole> {
  const { data } = await http.post<StaffRole>("garage/staff/roles/", body)
  return data
}

/** ساخت کارکن جدید */
export async function createStaff(body: Partial<Staff>): Promise<Staff> {
  const { data } = await http.post<Staff>("garage/staff/", body)
  return data
}

/** ویرایش کارکن */
export async function updateStaff(id: number, body: Partial<Staff>): Promise<Staff> {
  const { data } = await http.patch<Staff>(`garage/staff/${id}/`, body)
  return data
}

/** حذف کارکن */
export async function deleteStaff(id: number): Promise<void> {
  await http.delete(`garage/staff/${id}/`)
}

// ─── حسابداری ───────────────────────────────────────────────────────────────

import type {
  AccountingSummary,
  Cheque,
  ChequeDirection,
  ChequeStatus,
  InventoryReport,
  PaymentMethod,
  StockEntry,
  Transaction,
  TransactionCategory,
  TransactionKind,
} from "@/lib/types"

/** خلاصه‌ی مالی یک بازه (ماه). date_from / date_to به‌صورت میلادی ISO */
export async function fetchAccountingSummary(
  dateFrom: string,
  dateTo: string,
): Promise<AccountingSummary | null> {
  try {
    const { data } = await http.get<AccountingSummary>("accounting/reports/summary/", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return data
  } catch {
    return null
  }
}

export interface TransactionFilters {
  kind?: TransactionKind
  date_from?: string
  date_to?: string
  category?: number
}

export async function fetchTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  try {
    const { data } = await http.get<Transaction[]>("accounting/transactions/", { params: filters })
    return data
  } catch {
    return []
  }
}

export interface TransactionPayload {
  kind: TransactionKind
  title: string
  amount: number
  category?: number | null
  payment_method?: PaymentMethod
  description?: string | null
  occurred_at: string
  visit?: number | null
}

export async function createTransaction(body: TransactionPayload): Promise<Transaction> {
  const { data } = await http.post<Transaction>("accounting/transactions/", body)
  return data
}

export async function updateTransaction(
  id: number,
  body: Partial<TransactionPayload>,
): Promise<Transaction> {
  const { data } = await http.patch<Transaction>(`accounting/transactions/${id}/`, body)
  return data
}

export async function deleteTransaction(id: number): Promise<void> {
  await http.delete(`accounting/transactions/${id}/`)
}

export async function fetchTransactionCategories(kind?: TransactionKind): Promise<TransactionCategory[]> {
  try {
    const { data } = await http.get<TransactionCategory[]>("accounting/categories/", {
      params: kind ? { kind } : undefined,
    })
    return data
  } catch {
    return []
  }
}

export async function createTransactionCategory(
  body: { name: string; kind: TransactionKind; description?: string | null },
): Promise<TransactionCategory> {
  const { data } = await http.post<TransactionCategory>("accounting/categories/", body)
  return data
}

// ─── چک‌ها ──────────────────────────────────────────────────────────────────

export interface ChequeFilters {
  direction?: ChequeDirection
  status?: ChequeStatus
  due_from?: string
  due_to?: string
}

export async function fetchCheques(filters: ChequeFilters = {}): Promise<Cheque[]> {
  try {
    const { data } = await http.get<Cheque[]>("accounting/cheques/", { params: filters })
    return data
  } catch {
    return []
  }
}

export interface ChequePayload {
  direction: ChequeDirection
  status?: ChequeStatus
  amount: number
  cheque_number?: string | null
  bank_name?: string | null
  counterparty?: string | null
  issue_date?: string | null
  due_date: string
  cleared_at?: string | null
  description?: string | null
}

export async function createCheque(body: ChequePayload): Promise<Cheque> {
  const { data } = await http.post<Cheque>("accounting/cheques/", body)
  return data
}

export async function updateCheque(id: number, body: Partial<ChequePayload>): Promise<Cheque> {
  const { data } = await http.patch<Cheque>(`accounting/cheques/${id}/`, body)
  return data
}

export async function deleteCheque(id: number): Promise<void> {
  await http.delete(`accounting/cheques/${id}/`)
}

// ─── انبار (گزارش + ورود کالا + محصول جدید) ─────────────────────────────────

export async function fetchInventoryReport(threshold?: number): Promise<InventoryReport | null> {
  try {
    const { data } = await http.get<InventoryReport>("inventory/report/", {
      params: threshold != null ? { threshold } : undefined,
    })
    return data
  } catch {
    return null
  }
}

export async function fetchStockEntries(productId?: number): Promise<StockEntry[]> {
  try {
    const { data } = await http.get<StockEntry[]>("inventory/stock_entries/", {
      params: productId != null ? { product: productId } : undefined,
    })
    return data
  } catch {
    return []
  }
}

export interface StockEntryPayload {
  product: number
  quantity: number
  /** قیمت جدید کالا؛ اگر ارسال نشود قیمت فعلی حفظ می‌شود */
  unit_cost?: number
  supplier?: string | null
  description?: string | null
}

/** ثبت ورود کالا به انبار (شارژ موجودی) */
export async function createStockEntry(body: StockEntryPayload): Promise<StockEntry> {
  const { data } = await http.post<StockEntry>("inventory/stock_entries/", body)
  return data
}

export interface CreateProductPayload {
  name: string
  price: number
  stock: number
  description?: string | null
  product_type?: { id: number } | { id: null; name: string } | null
}

/** ساخت محصول جدید در انبار */
export async function createProduct(body: CreateProductPayload): Promise<Product> {
  const { data } = await http.post<Product>("inventory/products/", body)
  return data
}
