"use client"

import { useState } from "react"
import {
  Clock,
  Gauge,
  Package,
  UserCircle,
  Wrench,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LicensePlate } from "@/components/license-plate"
import type { Visit } from "@/lib/types"
import { carToPlate } from "@/lib/types"
import { formatToman, toFa, VISIT_STATUS_LABEL } from "@/lib/format"
import { formatJalaliDate } from "@/lib/jalali"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<string, string> = {
  queued: "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready: "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
}

export function VisitReadonlySheet({
  visit,
  open,
  onOpenChange,
}: {
  visit: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!visit) return null

  const { car, service_orders, product_orders, staff, status, created_at, current_mileage, next_mileage } = visit
  const carLabel = car?.model
    ? [car.model.model].filter(Boolean).join(" ") || "خودروی ناشناس"
    : "خودروی ناشناس"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" dir="rtl" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-3 border-b border-border bg-card p-6 text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">{carLabel}</SheetTitle>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                {formatJalaliDate(created_at)}
              </div>
            </div>
            <Badge className={cn("shrink-0", STATUS_STYLE[status])}>
              {VISIT_STATUS_LABEL[status]}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 p-6">
          {/* پلاک */}
          {(() => {
            const plate = carToPlate(car)
            return plate ? <LicensePlate plate={plate} size="md" /> : null
          })()}

          {/* کیلومتر */}
          {(current_mileage != null || next_mileage != null) && (
            <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              {current_mileage != null && (
                <div className="flex items-center gap-1.5">
                  <Gauge className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">کیلومتر فعلی:</span>
                  <span className="font-medium">{toFa(current_mileage)}</span>
                </div>
              )}
              {next_mileage != null && (
                <div className="flex items-center gap-1.5">
                  <Gauge className="size-4 text-chart-3" />
                  <span className="text-muted-foreground">کیلومتر بعدی:</span>
                  <span className="font-medium">{toFa(next_mileage)}</span>
                </div>
              )}
            </div>
          )}

          {/* سرویس‌کاران */}
          {staff && staff.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <UserCircle className="size-4 shrink-0" />
              <span className="font-medium text-foreground">سرویس‌کاران:</span>
              {staff.map((s, idx) => (
                <span key={s.id}>
                  {s.first_name} {s.last_name ?? ""}
                  {idx < staff.length - 1 && "، "}
                </span>
              ))}
            </div>
          )}

          <Separator />

          {/* سرویس‌ها */}
          {service_orders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Wrench className="size-4 text-primary" />
                سرویس‌های انجام شده
              </p>
              <ul className="space-y-1.5">
                {service_orders.map((so) => (
                  <li key={so.id} className="rounded-lg border border-border bg-card px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{so.title ?? so.service?.title ?? "سرویس"}</span>
                      <span className="text-sm text-muted-foreground">{formatToman(so.price)}</span>
                    </div>
                    {so.staff && so.staff.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserCircle className="size-3" />
                        {so.staff.map((s) => `${s.first_name} ${s.last_name ?? ""}`).join("، ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
                <span>جمع سرویس‌ها</span>
                <span className="font-medium text-foreground">{formatToman(service_orders.reduce((s, o) => s + o.price, 0))}</span>
              </div>
            </div>
          )}

          {/* قطعات */}
          {product_orders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="size-4 text-chart-2" />
                قطعات و کالاهای استفاده شده
              </p>
              <ul className="space-y-1.5">
                {product_orders.map((po) => (
                  <li key={po.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="font-medium">{po.product?.name ?? "کالا"}</span>
                    <span className="text-muted-foreground">
                      {toFa(po.quantity)} عدد × {formatToman(po.total_price / po.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
                <span>جمع قطعات</span>
                <span className="font-medium text-foreground">{formatToman(product_orders.reduce((s, o) => s + o.total_price, 0))}</span>
              </div>
            </div>
          )}

          {/* جمع کل */}
          {(service_orders.length > 0 || product_orders.length > 0) && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">مبلغ کل</span>
                <span className="text-lg font-bold text-primary">
                  {formatToman(
                    service_orders.reduce((s, o) => s + o.price, 0) +
                    product_orders.reduce((s, o) => s + o.total_price, 0)
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
