"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  Gauge,
  History,
  Loader2,
  Package,
  Search,
  UserCircle,
  Users,
  Warehouse,
  Wrench,
  X,
} from "lucide-react"
import DatePicker from "react-multi-date-picker"
import persian from "react-date-object/calendars/persian"
import persian_fa from "react-date-object/locales/persian_fa"
import type DateObject from "react-date-object"
import "react-multi-date-picker/styles/layouts/mobile.css"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNav } from "@/components/mobile-nav"

import { LicensePlate } from "@/components/license-plate"
import { VisitReadonlySheet } from "@/components/visit-readonly-sheet"
import { useAuth } from "@/components/auth-provider"
import { searchVisits, type VisitSearchParams } from "@/lib/api"
import { formatToman, toFa, VISIT_STATUS_LABEL } from "@/lib/format"
import { formatJalaliDate } from "@/lib/jalali"
import type { ProductOrder, ServiceOrder, Visit, VisitStatus, Plate } from "@/lib/types"
import { carToPlate } from "@/lib/types"

const STATUS_STYLE: Record<VisitStatus, string> = {
  queued: "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready: "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
}

function emptyPlate(): Plate {
  return { twoDigits: "", letter: "", threeDigits: "", region: "" }
}

function buildSearchParams(plateObj: Plate, phone: string, dateFrom: string, dateTo: string): VisitSearchParams | null {
  const hasPlateFilter = plateObj.twoDigits || plateObj.threeDigits || plateObj.region || plateObj.letter !== ""
  const hasAnyFilter = hasPlateFilter || phone.trim() || dateFrom || dateTo
  if (!hasAnyFilter) return null
  return {
    plate_first: plateObj.twoDigits || undefined,
    plate_letter: hasPlateFilter ? plateObj.letter : undefined,
    plate_second: plateObj.threeDigits || undefined,
    plate_region: plateObj.region || undefined,
    phone: phone.trim() || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }
}

export default function HistoryPage() {
  const { isLoading: authLoading } = useAuth()

  const [plateObj, setPlateObj] = useState<Plate>(emptyPlate)
  const [phone, setPhone] = useState("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  // DateObject instances for the DatePicker (persian calendar)
  const [dateFromObj, setDateFromObj] = useState<DateObject | null>(null)
  const [dateToObj, setDateToObj] = useState<DateObject | null>(null)

  // Debounced search params — after 400ms of no changes, search fires
  const [debouncedParams, setDebouncedParams] = useState<VisitSearchParams | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Whenever any filter changes, reset the debounce timer
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedParams(buildSearchParams(plateObj, phone, dateFrom, dateTo))
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [plateObj, phone, dateFrom, dateTo])

  // Also allow immediate search on form submit
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (timerRef.current) clearTimeout(timerRef.current)
    setDebouncedParams(buildSearchParams(plateObj, phone, dateFrom, dateTo))
  }

  function handleClear() {
    setPlateObj(emptyPlate())
    setPhone("")
    setDateFrom("")
    setDateTo("")
    setDateFromObj(null)
    setDateToObj(null)
  }

  const hasPlateFilter = plateObj.twoDigits || plateObj.threeDigits || plateObj.region || plateObj.letter !== ""
  const hasAnyFilter = hasPlateFilter || phone.trim() || dateFrom || dateTo

  const {
    data: visits = [],
    isLoading,
  } = useSWR<Visit[]>(
    debouncedParams ? `garage/visits/search?${JSON.stringify(debouncedParams)}` : null,
    () => debouncedParams ? searchVisits(debouncedParams) : Promise.resolve([]),
    { revalidateOnFocus: false },
  )


  // Visit detail sheet
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  function openVisit(visit: Visit) {
    setSelectedVisit(visit)
    setSheetOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* هدر */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/garage"
              className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 sm:size-11"
            >
              <ArrowLeft className="size-5 sm:size-6" />
            </Link>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-xl">
                جستجوی ویزیت‌ها
              </h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                جستجو بین تمام ویزیت‌ها بر اساس پلاک، شماره تلفن و تاریخ
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {authLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : null}
            <ThemeToggle />
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* نوار جستجو */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* پلاک */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                شماره پلاک
              </label>
              <div className="flex">
                <LicensePlate
                  plate={plateObj}
                  size="md"
                  editable
                  allowEmptyLetter
                  onPlateChange={setPlateObj}
                />
              </div>
            </div>

            {/* شماره تلفن */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                شماره تلفن مالک
              </label>
              <Input
                dir="ltr"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-mono"
              />
            </div>

            {/* از تاریخ - تقویم جلالی */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                از تاریخ
              </label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={dateFromObj || null}
                onChange={(val) => {
                  if (val) {
                    const d = val as DateObject
                    const iso = d.toDate().toISOString().split("T")[0]
                    setDateFrom(iso)
                    setDateFromObj(val)
                  } else {
                    setDateFrom("")
                    setDateFromObj(null)
                  }
                }}
                format="YYYY/MM/DD"
                inputClass="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ"
              />
            </div>

            {/* تا تاریخ - تقویم جلالی */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                تا تاریخ
              </label>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                value={dateToObj || null}
                onChange={(val) => {
                  if (val) {
                    const d = val as DateObject
                    const iso = d.toDate().toISOString().split("T")[0]
                    setDateTo(iso)
                    setDateToObj(val)
                  } else {
                    setDateTo("")
                    setDateToObj(null)
                  }
                }}
                format="YYYY/MM/DD"
                inputClass="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                containerClassName="w-full"
                placeholder="انتخاب تاریخ"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={!hasAnyFilter} className="gap-1.5">
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              جستجو
            </Button>
            {hasAnyFilter && (
              <Button type="button" variant="ghost" onClick={handleClear} className="gap-1.5 text-muted-foreground">
                <X className="size-4" />
                پاک کردن فیلترها
              </Button>
            )}
          </div>
        </form>

        {/* نتایج */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <History className="size-4 text-muted-foreground" />
              {debouncedParams ? "نتایج جستجو" : "همه ویزیت‌ها"}
              {debouncedParams && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {toFa(visits.length)}
                </span>
              )}
            </h2>
          </div>

          {!debouncedParams ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <Search className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                برای جستجو، یکی از فیلترهای بالا را پر کنید — نتایج به‌صورت ودکار نمایش داده می‌شوند.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <Warehouse className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                هیچ ویزیتی با فیلتهای وارد شده پیدا نشد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} onSelect={openVisit} />
              ))}
            </div>
          )}
        </section>
      </main>

      <VisitReadonlySheet
        visit={selectedVisit}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}

// ---- کارت ویزیت ----
function VisitCard({
  visit,
  onSelect,
}: {
  visit: Visit
  onSelect: (visit: Visit) => void
}) {
  const { car, service_orders, product_orders, staff, status, created_at, current_mileage, next_mileage } = visit
  const carLabel = car?.model
    ? [car.model.make, car.model.model].filter(Boolean).join(" ") || "خودروی ناشناس"
    : "خودروی ناشناس"

  const servicesTotal = service_orders.reduce((s, o) => s + o.price, 0)
  const productsTotal = product_orders.reduce((s, o) => s + o.total_price, 0)

  return (
    <Card
      className="gap-0 cursor-pointer overflow-hidden p-0 transition-shadow hover:shadow-md"
      onClick={() => onSelect(visit)}
    >
      {/* هدر کارت */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        {(() => {
          const plate = carToPlate(car)
          return plate ? (
            <LicensePlate plate={plate} />
          ) : (
            <span className="font-mono text-sm font-bold tracking-widest">—</span>
          )
        })()}
        <Badge className={STATUS_STYLE[status]}>{VISIT_STATUS_LABEL[status]}</Badge>
      </div>

      {/* بدنه کارت */}
      <div className="space-y-3 p-4">
        {/* نام خودرو + تاریخ */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold leading-tight truncate">{carLabel}</h3>
            {car?.manufacturing_year != null && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                مدل {toFa(car.manufacturing_year)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatJalaliDate(created_at)}
          </div>
        </div>

        {/* شماره تلفن مالک */}
        {car?.owner?.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCircle className="size-3.5 shrink-0" />
            <span dir="ltr" className="font-mono">{toFa(car.owner.phone)}</span>
          </div>
        )}

        {/* کیلومتر فعلی و بعدی */}
        {(current_mileage != null || next_mileage != null) && (
          <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            {current_mileage != null && (
              <div className="flex items-center gap-1.5">
                <Gauge className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">فعلی:</span>
                <span className="font-medium">{toFa(current_mileage)}</span>
              </div>
            )}
            {next_mileage != null && (
              <div className="flex items-center gap-1.5">
                <Gauge className="size-3.5 text-chart-3" />
                <span className="text-muted-foreground">بعدی:</span>
                <span className="font-medium">{toFa(next_mileage)}</span>
              </div>
            )}
          </div>
        )}

        {/* سرویس‌کاران */}
        {staff && staff.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            <span className="font-medium text-foreground">سرویس‌کاران:</span>
            {staff.map((s, idx) => (
              <span key={s.id}>
                {s.first_name} {s.last_name ?? ""}
                {idx < staff.length - 1 && "، "}
              </span>
            ))}
          </div>
        )}

        {/* سرویس‌های انجام شده */}
        {service_orders.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Wrench className="size-3.5 text-primary" />
              سرویس‌ها
            </p>
            <div className="space-y-1">
              {service_orders.map((so: ServiceOrder) => (
                <div
                  key={so.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/20 px-2.5 py-1.5 text-sm"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{so.title ?? so.service?.title ?? "سرویس"}</span>
                    {so.staff && so.staff.length > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({so.staff.map((s) => s.first_name).join("، ")})
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-muted-foreground">{formatToman(so.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* قطعات و کالاهای استفاده شد */}
        {product_orders.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Package className="size-3.5 text-chart-2" />
              قطعات
            </p>
            <div className="space-y-1">
              {product_orders.map((po: ProductOrder) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/20 px-2.5 py-1.5 text-sm"
                >
                  <span className="truncate">{po.product?.name ?? "کالا"}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {toFa(po.quantity)} عدد × {formatToman(po.total_price / po.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* جمع کل */}
        {(service_orders.length > 0 || product_orders.length > 0) && (
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>جمع کل</span>
            <span className="text-primary">{formatToman(servicesTotal + productsTotal)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
