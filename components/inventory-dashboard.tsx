"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  AlertTriangle,
  Boxes,
  Home,
  Layers,
  Loader2,
  PackageX,
  PackagePlus,
  Search,
  Wallet,
  Warehouse,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { RestockDialog } from "@/components/restock-dialog"
import { AddProductDialog } from "@/components/add-product-dialog"
import { fetchInventoryReport, fetchProducts } from "@/lib/api"
import { formatToman, toFa } from "@/lib/format"
import type { InventoryReport, Product } from "@/lib/types"

const LOW_STOCK_THRESHOLD = 5

export function InventoryDashboard() {
  const [query, setQuery] = useState("")

  const { data: report, mutate: mutateReport } = useSWR<InventoryReport | null>(
    "inventory-report",
    () => fetchInventoryReport(LOW_STOCK_THRESHOLD),
    { revalidateOnFocus: false },
  )

  const { data: products = [], isLoading, mutate: mutateProducts } = useSWR<Product[]>(
    "inventory-products",
    fetchProducts,
    { revalidateOnFocus: false },
  )

  function refresh() {
    mutateReport()
    mutateProducts()
  }

  const filtered = useMemo(() => {
    const q = query.trim()
    const list = q
      ? products.filter(
          (p) =>
            p.name.includes(q) ||
            (p.product_type?.name ?? "").includes(q),
        )
      : products
    return [...list].sort((a, b) => a.stock - b.stock)
  }, [products, query])

  const lowStockIds = new Set((report?.low_stock ?? []).map((l) => l.id))

  return (
    <div className="min-h-screen bg-background">
      {/* هدر */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-11">
              <Warehouse className="size-5 sm:size-6" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-xl">انبار</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                موجودی کالاها و ورود جنس
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <AddProductDialog onSuccess={refresh} />
              <RestockDialog onSuccess={refresh} />
            </div>
            <Button variant="ghost" size="icon" asChild title="حسابداری">
              <Link href="/accounting"><Wallet className="size-5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="داشبورد گاراژ">
              <Link href="/garage"><Home className="size-5" /></Link>
            </Button>
            <MobileNav />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* کارت‌های خلاصه */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="ارزش کل موجودی"
            value={formatToman(report?.total_value ?? 0)}
            icon={<Wallet className="size-5" />}
            tone="border-primary/30 bg-primary/5 text-primary"
          />
          <StatCard
            label="تعداد کل واحدها"
            value={`${toFa(report?.total_units ?? 0)} عدد`}
            icon={<Boxes className="size-5" />}
            tone="border-chart-2/30 bg-chart-2/5 text-chart-2"
          />
          <StatCard
            label="تنوع کالا"
            value={`${toFa(report?.product_count ?? 0)} قلم`}
            icon={<Layers className="size-5" />}
            tone="border-chart-4/30 bg-chart-4/5 text-chart-4"
          />
          <StatCard
            label="رو به اتمام"
            value={`${toFa(report?.low_stock.length ?? 0)} قلم`}
            icon={<AlertTriangle className="size-5" />}
            tone="border-chart-3/30 bg-chart-3/5 text-chart-3"
          />
        </div>

        {/* هشدار کالاهای رو به اتمام */}
        {report && report.low_stock.length > 0 && (
          <Card className="gap-0 border-chart-3/40 bg-chart-3/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-chart-3">
              <AlertTriangle className="size-4" />
              کالاهای رو به اتمام (موجودی ≤ {toFa(report.low_stock_threshold)})
            </div>
            <div className="flex flex-wrap gap-2">
              {report.low_stock.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1.5 rounded-full border border-chart-3/40 bg-background px-2.5 py-1 text-xs">
                  {l.stock <= 0 ? <PackageX className="size-3 text-destructive" /> : <AlertTriangle className="size-3 text-chart-3" />}
                  {l.name}
                  <span className="font-bold">{toFa(l.stock)}</span>
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* جستجو + دکمه‌های موبایل */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی کالا…"
              className="pr-9"
            />
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <AddProductDialog onSuccess={refresh} />
            <RestockDialog onSuccess={refresh} />
          </div>
        </div>

        {/* جدول موجودی */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <Warehouse className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">کالایی یافت نشد.</p>
          </div>
        ) : (
          <Card className="gap-0 overflow-hidden p-0">
            {/* هدر جدول — دسکتاپ */}
            <div className="hidden border-b border-border bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4">
              <span>نام کالا</span>
              <span className="w-24 text-center">موجودی</span>
              <span className="w-28 text-left">قیمت واحد</span>
              <span className="w-32 text-left">ارزش موجودی</span>
              <span className="w-24 text-center">عملیات</span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((p) => (
                <ProductRow key={p.id} product={p} isLow={lowStockIds.has(p.id)} onChanged={refresh} />
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone: string
}) {
  return (
    <Card className={`gap-0 p-4 ${tone}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium sm:text-sm">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-lg font-bold tracking-tight sm:text-xl">{value}</p>
    </Card>
  )
}

function ProductRow({
  product,
  isLow,
  onChanged,
}: {
  product: Product
  isLow: boolean
  onChanged: () => void
}) {
  const value = product.stock * product.price
  return (
    <div className="grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4">
      {/* نام */}
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="truncate font-medium">{product.name}</p>
        {product.product_type && (
          <p className="truncate text-xs text-muted-foreground">{product.product_type.name}</p>
        )}
      </div>

      {/* موجودی */}
      <div className="sm:w-24 sm:text-center">
        {product.stock <= 0 ? (
          <Badge className="border-destructive/40 bg-destructive/10 text-destructive">ناموجود</Badge>
        ) : isLow ? (
          <Badge className="border-chart-3/40 bg-chart-3/10 text-chart-3">{toFa(product.stock)} عدد</Badge>
        ) : (
          <span className="text-sm font-bold">{toFa(product.stock)} <span className="text-xs font-normal text-muted-foreground">عدد</span></span>
        )}
      </div>

      {/* قیمت واحد */}
      <div className="text-sm text-muted-foreground sm:w-28 sm:text-left">
        {formatToman(product.price)}
      </div>

      {/* ارزش موجودی */}
      <div className="text-sm font-medium sm:w-32 sm:text-left">
        {formatToman(value)}
      </div>

      {/* عملیات */}
      <div className="col-span-2 flex justify-end sm:col-span-1 sm:w-24 sm:justify-center">
        <RestockDialog
          product={product}
          onSuccess={onChanged}
          trigger={
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <PackagePlus className="size-3.5" />
              شارژ
            </Button>
          }
        />
      </div>
    </div>
  )
}
