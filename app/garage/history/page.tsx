"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  History,
  Loader2,
  LogIn,
  LogOut,
  Search,
  UserCircle,
  Warehouse,
  Wrench,
  X,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"

import { LicensePlate } from "@/components/license-plate"
import { VisitDetailSheet } from "@/components/visit-detail-sheet"
import { useAuth } from "@/components/auth-provider"
import { searchVisits, type VisitSearchParams } from "@/lib/api"
import { toFa, VISIT_STATUS_LABEL } from "@/lib/format"
import type { ServiceOrder, Visit, VisitStatus, Plate } from "@/lib/types"
import { carToPlate } from "@/lib/types"

const STATUS_STYLE: Record<VisitStatus, string> = {
  queued: "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready: "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
}

function formatJalaliDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
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
  const { user, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [plateObj, setPlateObj] = useState<Plate>(emptyPlate)
  const [phone, setPhone] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

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

  const hasPlateFilter = plateObj.twoDigits || plateObj.threeDigits || plateObj.region || plateObj.letter !== ""
  const hasAnyFilter = hasPlateFilter || phone.trim() || dateFrom || dateTo

  const {
    data: visits = [],
    isLoading,
    mutate,
  } = useSWR<Visit[]>(
    debouncedParams ? `garage/visits/search?${JSON.stringify(debouncedParams)}` : null,
    () => debouncedParams ? searchVisits(debouncedParams) : Promise.resolve([]),
    { revalidateOnFocus: false },
  )

  function handleClear() {
    setPlateObj(emptyPlate())
    setPhone("")
    setDateFrom("")
    setDateTo("")
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

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
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-1.5 sm:gap-2 sm:px-3">
                  <UserCircle className="size-5 shrink-0 text-primary" />
                  <span className="hidden text-sm font-medium leading-none sm:inline">
                    {user.profile?.first_name && user.profile?.last_name
                      ? `${user.profile.first_name} ${user.profile.last_name}`
                      : (user.profile?.first_name ?? user.phone)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">خروج</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/register">
                    <span className="hidden sm:inline">ثبت‌نام</span>
                    <span className="sm:hidden">عضویت</span>
                  </Link>
                </Button>
                <Button size="sm" asChild className="gap-1.5">
                  <Link href="/login">
                    <LogIn className="size-4" />
                    <span className="hidden sm:inline">ورود</span>
                  </Link>
                </Button>
              </div>
            )}
            <ThemeToggle />
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

            {/* از تاریخ */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                از تاریخ
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* تا تاریخ */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                تا تاریخ
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={!hasAnyFilter || isLoading} className="gap-1.5">
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
                برای جستجو، یکی از فیلترهای بالا را پر کنید — نتایج به‌صورت خودکار نمایش داده می‌شوند.
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
                هیچ ویزیتی با فیلترهای وارد شده پیدا نشد.
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

      <VisitDetailSheet
        visit={selectedVisit}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={() => {
          if (debouncedParams) {
            mutate()
          }
        }}
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
  const { car, service_orders, status, created_at } = visit
  const carLabel = car?.model
    ? [car.model.model].filter(Boolean).join(" ") || "خودروی ناشناس"
    : "خودروی ناشناس"

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
        {/* نام خودرو */}
        <div>
          <h3 className="font-bold leading-tight">{carLabel}</h3>
          {car?.manufacturing_year != null && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              مدل {toFa(car.manufacturing_year)}
            </p>
          )}
        </div>

        {/* شماره تلفن مالک */}
        {car?.owner?.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCircle className="size-3.5 shrink-0" />
            <span dir="ltr" className="font-mono">{toFa(car.owner.phone)}</span>
          </div>
        )}

        {/* سرویس‌ها */}
        {service_orders.length > 0 && (
          <div className="space-y-1.5">
            {service_orders.slice(0, 3).map((so: ServiceOrder) => (
              <div
                key={so.id}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Wrench className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  {so.title ?? so.service?.title ?? "سرویس بدون عنوان"}
                </span>
              </div>
            ))}
            {service_orders.length > 3 && (
              <p className="text-xs text-muted-foreground">
                + {toFa(service_orders.length - 3)} سرویس دیگر
              </p>
            )}
          </div>
        )}

        {/* تاریخ ثبت */}
        <div className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {formatJalaliDate(created_at)}
        </div>
      </div>
    </Card>
  )
}
