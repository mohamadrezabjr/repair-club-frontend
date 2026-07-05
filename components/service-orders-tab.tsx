"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Plus, Trash2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatToman } from "@/lib/format"
import {
  fetchServices,
  saveServiceOrders,
  updateServiceOrderStatus,
  deleteServiceOrder,
  type ServiceOrderPayload,
} from "@/lib/api"
import type { Service, ServiceOrder, ServiceOrderStatus } from "@/lib/types"

// ─── ثوابت ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  pending: "در انتظار",
  "in-progress": "در حال انجام",
  done: "انجام شد",
}

const STATUS_STYLE: Record<ServiceOrderStatus, string> = {
  pending: "border-muted bg-muted/40 text-muted-foreground",
  "in-progress": "border-primary/40 bg-primary/10 text-primary",
  done: "border-chart-3/40 bg-chart-3/10 text-chart-3",
}

const ALL_STATUSES = Object.keys(STATUS_LABEL) as ServiceOrderStatus[]

function orderTitle(so: ServiceOrder): string {
  return so.title ?? so.service?.title ?? "سرویس بدون عنوان"
}

// ─── کامپوننت اصلی ───────────────────────────────────────────────────────────

interface ServiceOrdersTabProps {
  visitId: number
  serviceOrders: ServiceOrder[]
  /** وقتی لیست تغییر کرد (حذف/وضعیت) این کال‌بک فراخوانی می‌شه */
  onUpdate: (updatedOrders: ServiceOrder[]) => void
}

export function ServiceOrdersTab({
  visitId,
  serviceOrders,
  onUpdate,
}: ServiceOrdersTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── تغییر وضعیت ──────────────────────────────────────────────────────────
  async function handleStatusChange(orderId: number, status: ServiceOrderStatus) {
    setUpdatingId(orderId)
    try {
      const updated = await updateServiceOrderStatus(visitId, orderId, status)
      onUpdate(
        serviceOrders.map((so) =>
          so.id === orderId ? { ...so, status: updated.status } : so,
        ),
      )
      toast.success("وضعیت سرویس بروز شد")
    } catch {
      toast.error("خطا در بروزرسانی وضعیت")
    } finally {
      setUpdatingId(null)
    }
  }

  // ── حذف ──────────────────────────────────────────────────────────────────
  async function handleDelete(orderId: number) {
    setDeletingId(orderId)
    try {
      await deleteServiceOrder(visitId, orderId)
      onUpdate(serviceOrders.filter((so) => so.id !== orderId))
      toast.success("سرویس حذف شد")
    } catch {
      toast.error("خطا در حذف سرویس")
    } finally {
      setDeletingId(null)
    }
  }

  // ── اضافه شدن سرویس جدید ─────────────────────────────────────────────────
  function handleAdded(allOrders: ServiceOrder[]) {
    onUpdate(allOrders)
    setDialogOpen(false)
  }

  // ── رندر ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* دکمه افزودن */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          افزودن سرویس
        </Button>
      </div>

      {/* لیست خالی */}
      {serviceOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Wrench className="size-6 opacity-50" />
          <p className="text-sm">هنوز سرویسی ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {serviceOrders.map((so) => (
            <li
              key={so.id}
              className="rounded-lg border border-border bg-card p-3 space-y-2"
            >
              {/* ردیف بالا: عنوان + دکمه حذف */}
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug truncate">
                    {orderTitle(so)}
                  </p>
                  {so.extra_description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {so.extra_description}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatToman(so.price)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(so.id)}
                  disabled={deletingId === so.id}
                >
                  {deletingId === so.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>

              {/* ردیف پایین: وضعیت */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">
                  وضعیت:
                </span>
                <Select
                  value={so.status}
                  onValueChange={(v) =>
                    v && handleStatusChange(so.id, v as ServiceOrderStatus)
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1 w-fit",
                      STATUS_STYLE[so.status] ?? "border-muted",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updatingId === so.id && (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* دیالوگ افزودن سرویس */}
      <AddServiceOrderDialog
        visitId={visitId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdded={handleAdded}
      />
    </div>
  )
}

// ─── دیالوگ افزودن سرویس ────────────────────────────────────────────────────

type AddMode = "existing" | "new"

interface AddServiceOrderDialogProps {
  visitId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (allOrders: ServiceOrder[]) => void
}

function AddServiceOrderDialog({
  visitId,
  open,
  onOpenChange,
  onAdded,
}: AddServiceOrderDialogProps) {
  const [mode, setMode] = useState<AddMode>("existing")

  // فیلدهای حالت "سرویس موجود"
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [titleOverride, setTitleOverride] = useState("")
  const [priceExisting, setPriceExisting] = useState("")
  const [extraDescExisting, setExtraDescExisting] = useState("")

  // فیلدهای حالت "سرویس جدید"
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [extraDescNew, setExtraDescNew] = useState("")

  const [submitting, setSubmitting] = useState(false)

  // لیست سرویس‌های موجود (فقط وقتی دیالوگ باز است fetch می‌شه)
  const { data: services = [], isLoading: servicesLoading } = useSWR<Service[]>(
    open ? "garage/services" : null,
    fetchServices,
  )

  function reset() {
    setMode("existing")
    setSelectedServiceId("")
    setTitleOverride("")
    setPriceExisting("")
    setExtraDescExisting("")
    setNewTitle("")
    setNewDescription("")
    setNewPrice("")
    setExtraDescNew("")
  }

  function handleClose(o: boolean) {
    if (!o) reset()
    onOpenChange(o)
  }

  async function handleSubmit() {
    // اعتبارسنجی
    if (mode === "existing") {
      if (!selectedServiceId) {
        toast.error("لطفاً یک سرویس انتخاب کنید")
        return
      }
    } else {
      if (!newTitle.trim()) {
        toast.error("لطفاً عنوان سرویس را وارد کنید")
        return
      }
      if (!newPrice.trim()) {
        toast.error("لطفاً قیمت سرویس را وارد کنید")
        return
      }
    }

    const price = parseFloat(
      mode === "existing" ? priceExisting : newPrice,
    ) || 0

    const payload: ServiceOrderPayload =
      mode === "existing"
        ? {
            id: null,
            service: { id: Number(selectedServiceId) },
            title: titleOverride.trim() || null,
            extra_description: extraDescExisting.trim() || null,
            price,
            status: "pending",
          }
        : {
            id: null,
            service: {
              id: null,
              title: newTitle.trim(),
              description: newDescription.trim() || null,
              base_price: price,
              mileage_interval: null,
              car_model: null,
              products_needed: [],
            },
            title: null,
            extra_description: extraDescNew.trim() || null,
            price,
            status: "pending",
          }

    setSubmitting(true)
    try {
      const updatedVisit = await saveServiceOrders(visitId, [payload])
      toast.success("سرویس با موفقیت اضافه شد")
      onAdded(updatedVisit.service_orders)
      reset()
    } catch {
      toast.error("خطا در ثبت سرویس. لطفاً دوباره تلاش کنید.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle>افزودن سرویس به ویزیت</DialogTitle>
        </DialogHeader>

        {/* تاگل حالت */}
        <div className="flex gap-1.5 rounded-xl bg-muted p-1">
          <ModeTab
            active={mode === "existing"}
            onClick={() => setMode("existing")}
          >
            از سرویس‌های موجود
          </ModeTab>
          <ModeTab
            active={mode === "new"}
            onClick={() => setMode("new")}
          >
            سرویس جدید
          </ModeTab>
        </div>

        {/* فرم */}
        <div className="space-y-4">
          {mode === "existing" ? (
            <>
              {/* انتخاب سرویس */}
              <div className="space-y-1.5">
                <Label>
                  سرویس <span className="text-destructive">*</span>
                </Label>
                {servicesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    در حال بارگذاری سرویس‌ها...
                  </div>
                ) : services.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    هیچ سرویسی تعریف نشده است. از حالت «سرویس جدید» استفاده کنید.
                  </p>
                ) : (
                  <Select
                    value={selectedServiceId}
                    onValueChange={(v) => setSelectedServiceId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب کنید..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.title}
                          {s.base_price
                            ? ` — ${formatToman(s.base_price)}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* عنوان اختیاری */}
              <div className="space-y-1.5">
                <Label>
                  عنوان سفارش{" "}
                  <span className="text-muted-foreground text-xs">
                    (اختیاری — جایگزین عنوان سرویس)
                  </span>
                </Label>
                <Input
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  placeholder="مثلاً: تعویض روغن موتور سیلک ۱۰۰۰۰"
                />
              </div>

              {/* قیمت */}
              <div className="space-y-1.5">
                <Label>قیمت (تومان)</Label>
                <Input
                  inputMode="numeric"
                  value={priceExisting}
                  onChange={(e) =>
                    setPriceExisting(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="مثلاً: ۵۰۰۰۰۰"
                />
              </div>

              {/* توضیح اضافه */}
              <div className="space-y-1.5">
                <Label>
                  توضیح اضافه{" "}
                  <span className="text-muted-foreground text-xs">(اختیاری)</span>
                </Label>
                <Input
                  value={extraDescExisting}
                  onChange={(e) => setExtraDescExisting(e.target.value)}
                  placeholder="توضیحات جزئی..."
                />
              </div>
            </>
          ) : (
            <>
              {/* عنوان سرویس جدید */}
              <div className="space-y-1.5">
                <Label>
                  عنوان سرویس <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثلاً: تعویض تایمینگ"
                />
              </div>

              {/* توضیحات سرویس */}
              <div className="space-y-1.5">
                <Label>
                  توضیحات{" "}
                  <span className="text-muted-foreground text-xs">(اختیاری)</span>
                </Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="شرح کامل سرویس..."
                />
              </div>

              {/* قیمت */}
              <div className="space-y-1.5">
                <Label>
                  قیمت (تومان) <span className="text-destructive">*</span>
                </Label>
                <Input
                  inputMode="numeric"
                  value={newPrice}
                  onChange={(e) =>
                    setNewPrice(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="مثلاً: ۲۵۰۰۰۰۰"
                />
              </div>

              {/* توضیح اضافه */}
              <div className="space-y-1.5">
                <Label>
                  توضیح اضافه{" "}
                  <span className="text-muted-foreground text-xs">(اختیاری)</span>
                </Label>
                <Input
                  value={extraDescNew}
                  onChange={(e) => setExtraDescNew(e.target.value)}
                  placeholder="توضیحات جزئی..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              "افزودن سرویس"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── کامپوننت کمکی: تاب حالت ────────────────────────────────────────────────

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
