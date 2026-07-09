"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Circle,
  Loader2,
  Package,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatToman, toFa } from "@/lib/format"
import {
  updateServiceOrderStatus,
  deleteServiceOrder,
  updateVisit,
} from "@/lib/api"
import { toast } from "sonner"
import type { ProductOrder, ServiceOrder, Visit, VisitStatus } from "@/lib/types"

// ---- وضعیت‌های قابل انتخاب برای پایان ویزیت ----
const FINISH_STATUSES: { value: VisitStatus; label: string; description: string }[] = [
  {
    value: "ready",
    label: "آماده تحویل",
    description: "خودرو تعمیر شده و آماده تحویل به مشتری است.",
  },
  {
    value: "delivered",
    label: "تحویل داده شده",
    description: "خودرو به مشتری تحویل داده شده است.",
  },
]

// ---- برچسب‌ها و رنگ وضعیت سرویس‌اوردر ----
const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار",
  "in-progress": "در حال انجام",
  done: "انجام شد",
}
const STATUS_STYLE: Record<string, string> = {
  pending: "border-muted bg-muted/40 text-muted-foreground",
  "in-progress": "border-primary/40 bg-primary/20 text-primary",
  done: "border-chart-3/40 bg-chart-3/20 text-chart-3",
}

function isDone(so: ServiceOrder) {
  return so.status === "done"
}

interface VisitFinishModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  visit: Visit
  serviceOrders: ServiceOrder[]
  productOrders: ProductOrder[]
  onFinished: (updatedOrders: ServiceOrder[], newStatus: VisitStatus) => void
}

export function VisitFinishModal({
  open,
  onOpenChange,
  visit,
  serviceOrders,
  productOrders,
  onFinished,
}: VisitFinishModalProps) {
  const [orders, setOrders] = useState<ServiceOrder[]>(serviceOrders)
  const [finalStatus, setFinalStatus] = useState<VisitStatus>("ready")
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  // هر بار که مودال باز می‌شود یا serviceOrders از بیرون تغییر می‌کند، sync کن
  useEffect(() => {
    if (open) {
      setOrders(serviceOrders)
      setFinalStatus("ready")
    }
  }, [open, serviceOrders])

  function handleOpenChange(v: boolean) {
    onOpenChange(v)
  }

  const doneOrders = orders.filter(isDone)
  const pendingOrders = orders.filter((so) => !isDone(so))
  const hasUnfinished = pendingOrders.length > 0

  // ---- تغییر همه ناتمام‌ها به done ----
  async function markAllDone() {
    setMarkingAll(true)
    try {
      const updated = await Promise.all(
        pendingOrders.map((so) =>
          updateServiceOrderStatus(visit.id, so.id, "done"),
        ),
      )
      setOrders((prev) =>
        prev.map((so) => {
          const found = updated.find((u) => u.id === so.id)
          return found ?? so
        }),
      )
      toast.success("همه سرویس‌های ناتمام به انجام‌شده تغییر کردند")
    } catch {
      toast.error("خطا در آپدیت وضعیت سرویس‌ها")
    } finally {
      setMarkingAll(false)
    }
  }

  // ---- حذف یک سرویس ناتمام ----
  async function handleDelete(orderId: number) {
    setDeletingId(orderId)
    try {
      await deleteServiceOrder(visit.id, orderId)
      setOrders((prev) => prev.filter((so) => so.id !== orderId))
      toast.success("سرویس حذف شد")
    } catch {
      toast.error("خطا در حذف سرویس")
    } finally {
      setDeletingId(null)
    }
  }

  // ---- تایید نهایی ----
  async function handleConfirm() {
    setConfirming(true)
    try {
      await updateVisit(visit.id, { status: finalStatus })
      toast.success("ویزیت با موفقیت بسته شد")
      onFinished(orders, finalStatus)
      onOpenChange(false)
    } catch {
      toast.error("خطا در بستن ویزیت")
    } finally {
      setConfirming(false)
    }
  }

  const servicesTotal = doneOrders.reduce((s, o) => s + o.price, 0)
  const productsTotal = productOrders.reduce((s, o) => s + o.total_price, 0)
  const grandTotal = servicesTotal + productsTotal

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-lg font-bold">پایان ویزیت</DialogTitle>
        </DialogHeader>

        {/* ---- سرویس‌های انجام‌شده ---- */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-chart-3" />
            <h3 className="font-semibold text-sm">
              سرویس‌های انجام‌شده
              <span className="mr-1.5 text-muted-foreground font-normal">
                ({doneOrders.length})
              </span>
            </h3>
          </div>

          {doneOrders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
              هیچ سرویسی تکمیل نشده است.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {doneOrders.map((so) => (
                <li
                  key={so.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-chart-3/20 bg-chart-3/5 px-3 py-2.5"
                >
                  <span className="text-sm font-medium">
                    {so.title ?? so.service?.title ?? "سرویس بدون عنوان"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatToman(so.price)}
                    </span>
                    <Badge className={cn("text-xs", STATUS_STYLE["done"])}>
                      {STATUS_LABEL["done"]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- سرویس‌های ناتمام ---- */}
        {hasUnfinished && (
          <>
            <Separator />
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Circle className="size-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">
                    سرویس‌های ناتمام
                    <span className="mr-1.5 text-muted-foreground font-normal">
                      ({pendingOrders.length})
                    </span>
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={markAllDone}
                  disabled={markingAll}
                  className="h-7 gap-1.5 text-xs"
                >
                  {markingAll ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  تغییر همه به انجام‌شده
                </Button>
              </div>

              <ul className="space-y-1.5">
                {pendingOrders.map((so) => (
                  <li
                    key={so.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">
                      {so.title ?? so.service?.title ?? "سرویس بدون عنوان"}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge className={cn("text-xs", STATUS_STYLE[so.status])}>
                        {STATUS_LABEL[so.status]}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingId === so.id}
                        onClick={() => handleDelete(so.id)}
                        aria-label="حذف سرویس"
                      >
                        {deletingId === so.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <Separator />

        {/* ---- خلاصه کالاها ---- */}
        {productOrders.length > 0 && (
          <>
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-chart-2" />
                <h3 className="font-semibold text-sm">
                  قطعات و کالاها
                  <span className="mr-1.5 text-muted-foreground font-normal">
                    ({productOrders.length})
                  </span>
                </h3>
              </div>
              <ul className="space-y-1.5">
                {productOrders.map((po) => (
                  <li
                    key={po.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-chart-2/20 bg-chart-2/5 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">
                      {po.product?.name ?? "کالای ناشناس"}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {toFa(po.quantity)} عدد
                      </span>
                      <span className="text-xs font-semibold">
                        {formatToman(po.total_price)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <Separator />
          </>
        )}

        {/* ---- جمع کل ---- */}
        <div className="space-y-1.5 rounded-lg bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">سرویس‌های انجام‌شده</span>
            <span>{formatToman(servicesTotal)}</span>
          </div>
          {productOrders.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">قطعات و کالاها</span>
              <span>{formatToman(productsTotal)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">مبلغ کل قابل پرداخت</span>
            <span className="font-bold text-primary">{formatToman(grandTotal)}</span>
          </div>
        </div>

        <Separator />

        {/* ---- انتخاب وضعیت نهایی ---- */}
        <section className="space-y-3">
          <h3 className="font-semibold text-sm">وضعیت نهایی ویزیت</h3>
          <RadioGroup
            value={finalStatus}
            onValueChange={(v) => setFinalStatus(v as VisitStatus)}
            className="space-y-2"
          >
            {FINISH_STATUSES.map((opt) => (
              <label
                key={opt.value}
                htmlFor={`finish-status-${opt.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  finalStatus === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <RadioGroupItem
                  value={opt.value}
                  id={`finish-status-${opt.value}`}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <Label
                    htmlFor={`finish-status-${opt.value}`}
                    className="cursor-pointer font-semibold"
                  >
                    {opt.label}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </section>

        <DialogFooter className="gap-2 pt-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            انصراف
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="gap-2 font-semibold"
          >
            {confirming ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                تایید پایان ویزیت
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
