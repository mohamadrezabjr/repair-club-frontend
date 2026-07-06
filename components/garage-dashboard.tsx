"use client"

import { useMemo, useState } from "react"
import { Car as CarIcon, Package, Search, Warehouse, Wrench } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import type { Car } from "@/lib/types"
import { toEn, toFa } from "@/lib/format"
import { useGarage } from "@/components/garage-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { AddCarDialog } from "@/components/add-car-dialog"
import { CarCard } from "@/components/car-card"
import { CarDetailSheet } from "@/components/car-detail-sheet"

export function GarageDashboard() {
  const { cars } = useGarage()
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedCar = cars.find((c) => c.id === selectedId) ?? null

  const filtered = useMemo(() => {
    const q = toEn(query.trim()).toLowerCase()
    if (!q) return cars
    return cars.filter((c) => {
      const plate = toEn(`${c.plate.twoDigits}${c.plate.letter}${c.plate.threeDigits}${c.plate.region}`)
      const haystack = `${c.brand} ${c.model} ${c.ownerName} ${plate} ${c.color}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [cars, query])

  const stats = useMemo(() => {
    const inProgress = cars.filter((c) => c.services.some((s) => s.status === "in-progress")).length
    const totalServices = cars.reduce((sum, c) => sum + c.services.length, 0)
    const totalParts = cars.reduce((sum, c) => sum + c.parts.length, 0)
    return { count: cars.length, inProgress, totalServices, totalParts }
  }, [cars])

  const openCar = (car: Car) => {
    setSelectedId(car.id)
    setSheetOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* هدر */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Warehouse className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight sm:text-xl">سامانه مدیریت تعمیرگاه</h1>
              <p className="text-sm text-muted-foreground">مدیریت خودروهای داخل گاراژ</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* آمار */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<CarIcon className="size-5" />} label="خودرو در گاراژ" value={stats.count} accent="text-primary" />
          <StatCard icon={<Wrench className="size-5" />} label="در حال تعمیر" value={stats.inProgress} accent="text-chart-4" />
          <StatCard icon={<Wrench className="size-5" />} label="کل سرویس‌ها" value={stats.totalServices} accent="text-chart-3" />
          <StatCard icon={<Package className="size-5" />} label="کل قطعات" value={stats.totalParts} accent="text-chart-2" />
        </div>

        {/* جستجو */}
        <div className="relative mt-6 max-w-md">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی پلاک، خودرو یا نام مالک..."
            className="pr-9"
          />
        </div>

        {/* فهرست خودروها */}
        <section className="mt-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            خودروهای داخل گاراژ
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {toFa(filtered.length)}
            </span>
          </h2>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
              <Warehouse className="size-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {cars.length === 0 ? "هیچ خودرویی در گاراژ ثبت نشده است." : "موردی یافت نشد."}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pb-4 pt-2 sm:px-6">
              {filtered.map((car) => (
                <CarCard key={car.id} car={car} onOpen={openCar} />
              ))}
            </div>
          )}
        </section>
      </main>

      <CarDetailSheet car={selectedCar} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <Card className="flex-row items-center gap-3 p-4">
      <div className={`flex size-10 items-center justify-center rounded-lg bg-muted ${accent}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold leading-none">{toFa(value)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}
