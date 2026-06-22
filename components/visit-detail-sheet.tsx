"use client"

import {
  CircleDot,
  Clock,
  FileText,
  Package,
  Phone,
  User as UserIcon,
  Wrench,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type {
  ProductOrder,
  ServiceOrder,
  ServiceOrderStatus,
  Visit,
  VisitStatus,
} from "@/lib/types"
import { formatToman, toFa } from "@/lib/format"
import { cn } from "@/lib/utils"

// ---- برچسب و استایل وضعیت ویزیت ----
const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  queued: "در نوبت",
  repairing: "در حال تعمیر",
  ready: "آماده تحویل",
  delivered: "تحویل داده شده",
  cancelled: "لغو شده",
}

const VISIT_STATUS_STYLE: Record<VisitStatus, string> = {
  queued: "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready: "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
}

// ---- برچسب وضعیت سفارش سرویس ----
const SERVICE_ORDER_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  pending: "در انتظار",
  "in-progress": "در حال انجام",
  done: "انجام شد",
}

const SERVICE_ORDER_STATUS_ICON_CLASS: Record<ServiceOrderStatus, string> = {
  pending: "text-muted-foreground",
  "in-progress": "text-primary",
  done: "text-chart-3",
}

// عنوان قابل نمایش سفارش سرویس: همیشه عنوان بیرونی، در غیر این صورت عنوان سرویس مرجع
function serviceOrderTitle(so: ServiceOrder): string {
  return so.title ?? so.service?.title ?? "سرویس بدون عنوان"
}

// نام خودرو از روی مدل
function carLabelOf(visit: Visit): string {
  const model = visit.car?.model
  if (!model) return "خودروی ناشناس"
  return [model.make, model.model].filter(Boolean).join(" ") || "خودروی ناشناس"
}

// ---- فرمت تاریخ ----
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ---- کامپوننت اصلی ----
export function VisitDetailSheet({
  visit,
  open,
  onOpenChange,
}: {
  visit: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!visit) return null

  const { car, service_orders, product_orders, status, created_at, description } = visit

  const carLabel = carLabelOf(visit)

  const ownerName = car?.owner?.profile
    ? [car.owner.profile.first_name, car.owner.profile.last_name]
        .filter(Boolean)
        .join(" ")
    : null

  const servicesTotal = service_orders.reduce((sum, s) => sum + s.price, 0)
  const productsTotal = product_orders.reduce((sum, p) => sum + p.total_price, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {/* ---- هدر شیت ---- */}
        <SheetHeader className="space-y-3 border-b border-border bg-card p-6 text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">{carLabel}</SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" />
                {formatDate(created_at)}
              </SheetDescription>
            </div>
            <Badge className={cn("shrink-0", VISIT_STATUS_STYLE[status])}>
              {VISIT_STATUS_LABEL[status]}
            </Badge>
          </div>

          {/* اطلاعات پایه */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
            <InfoRow label="شماره پلاک" value={car?.plate_number || "—"} />
            {car?.model?.model_year != null && (
              <InfoRow label="مدل سال" value={toFa(car.model.model_year)} />
            )}
            {car?.last_mileage != null && (
              <InfoRow label="کارکرد" value={`${toFa(car.last_mileage)} کیلومتر`} />
            )}
            {ownerName && (
              <InfoRow
                label="مالک"
                value={ownerName}
                icon={<UserIcon className="size-3.5" />}
              />
            )}
            {car?.owner?.phone && (
              <InfoRow
                label="تماس"
                value={toFa(car.owner.phone)}
                icon={<Phone className="size-3.5" />}
              />
            )}
          </div>

          {/* توضیحات ویزیت */}
          {description && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <p className="leading-relaxed text-muted-foreground">{description}</p>
            </div>
          )}
        </SheetHeader>

        {/* ---- تب‌ها ---- */}
        <Tabs defaultValue="services" className="flex-1 p-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services" className="gap-1.5">
              <Wrench className="size-4" />
              سرویس‌ها ({toFa(service_orders.length)})
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5">
              <Package className="size-4" />
              قطعات و کالا ({toFa(product_orders.length)})
            </TabsTrigger>
          </TabsList>

          {/* سفارش‌های سرویس */}
          <TabsContent value="services" className="mt-4">
            {service_orders.length === 0 ? (
              <EmptyState text="هنوز سرویسی ثبت نشده است." icon="wrench" />
            ) : (
              <ul className="space-y-2">
                {service_orders.map((so) => (
                  <li
                    key={so.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <CircleDot
                      className={cn(
                        "size-4 shrink-0",
                        SERVICE_ORDER_STATUS_ICON_CLASS[so.status] ??
                          "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{serviceOrderTitle(so)}</p>
                      {so.extra_description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {so.extra_description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {formatToman(so.price)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs">
                      {SERVICE_ORDER_STATUS_LABEL[so.status] ?? so.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* سفارش‌های قطعه */}
          <TabsContent value="products" className="mt-4">
            {product_orders.length === 0 ? (
              <EmptyState text="هنوز قطعه‌ای ثبت نشده است." icon="package" />
            ) : (
              <ul className="space-y-2">
                {product_orders.map((po: ProductOrder) => (
                  <li
                    key={po.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Package className="size-4 shrink-0 text-chart-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {po.product?.name ?? "کالای ناشناس"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {toFa(po.quantity)} عدد
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatToman(po.total_price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {/* ---- جمع کل ---- */}
        <div className="border-t border-border bg-card p-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>هزینه سرویس‌ها</span>
            <span>{formatToman(servicesTotal)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>هزینه قطعات</span>
            <span>{formatToman(productsTotal)}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">مبلغ کل قابل پرداخت</span>
            <span className="text-lg font-bold text-primary">
              {formatToman(servicesTotal + productsTotal)}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---- کامپوننت‌های کمکی ----
function InfoRow({
  label,
  value,
  icon,
  className,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function EmptyState({
  text,
  icon,
}: {
  text: string
  icon: "wrench" | "package"
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
      {icon === "wrench" ? (
        <Wrench className="size-6 opacity-50" />
      ) : (
        <Package className="size-6 opacity-50" />
      )}
      <p className="text-sm">{text}</p>
    </div>
  )
}
