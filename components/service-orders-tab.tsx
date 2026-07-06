"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { ChevronDown, Loader2, Plus, Trash2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

// ─── کامپوننت اصلی: لیست سرویس‌ها ─────────────────────────────────────────

interface ServiceOrdersTabProps {
  visitId: number
  serviceOrders: ServiceOrder[]
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

  function handleAdded(allOrders: ServiceOrder[]) {
    onUpdate(allOrders)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          افزودن سرویس
        </Button>
      </div>

      {serviceOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Wrench className="size-6 opacity-50" />
          <p className="text-sm">هنوز سرویسی ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {serviceOrders.map((so) => (
            <li key={so.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug truncate">{orderTitle(so)}</p>
                  {so.extra_description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {so.extra_description}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{formatToman(so.price)}</p>
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

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">وضعیت:</span>
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

      <AddServiceOrderDialog
        visitId={visitId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdded={handleAdded}
      />
    </div>
  )
}

// ─── کامپوننت سرچ‌باکس سرویس (Combobox) ────────────────────────────────────

interface ServiceComboboxProps {
  services: Service[]
  value: string        // آیدی سرویس انتخاب‌شده به صورت string
  onChange: (id: string) => void
}

function ServiceCombobox({ services, value, onChange }: ServiceComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedService = services.find((s) => String(s.id) === value) ?? null

  // sync query با value از بیرون (انتخاب یا ریست فرم)
  // فقط وقتی value از خارج عوض می‌شه اجرا بشه، نه وقتی کاربر داره تایپ می‌کنه
  useEffect(() => {
    if (value === "") {
      setQuery("")
    } else if (selectedService) {
      setQuery(selectedService.title)
    }
  }, [value, selectedService])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return services
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false),
    )
  }, [services, query])

  function handleSelect(service: Service) {
    onChange(String(service.id))
    setQuery(service.title)  // بلافاصله نام رو نشون بده
    setOpen(false)
  }

  function handleInputChange(val: string) {
    setQuery(val)
    // فقط وقتی اینپوت کاملاً خالی شد، انتخاب رو هم پاک کن
    // هرگز در حین تایپ نباید onChange('') صدا زده بشه — این باگ حلقه‌ای ایجاد می‌کنه:
    // onChange('') → value='' → selectedService=null → useEffect → setQuery('') → query پاک می‌شه!
    if (val === "") onChange("")
    setOpen(true)
  }

  // بستن dropdown با کلیک بیرون + بازگرداندن query به نام سرویس انتخاب‌شده
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // اگه کاربر بدون انتخاب کلیک کرد بیرون، query رو به نام سرویس فعلی برگردون
        const sel = services.find((s) => String(s.id) === value)
        setQuery(sel?.title ?? "")
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [value, services])

  return (
    <div className="relative" ref={containerRef}>
      {/* اینپوت سرچ */}
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="جستجو یا انتخاب سرویس..."
          className="pl-8"
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {/* لیست فیلترشده */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              موردی یافت نشد
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault() // جلوگیری از blur اینپوت قبل از کلیک
                  handleSelect(s)
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-right transition-colors hover:bg-accent",
                  String(s.id) === value && "bg-accent",
                )}
              >
                <span className="font-medium text-sm">{s.title}</span>
                {(s.base_price != null || s.description) && (
                  <span className="text-xs text-muted-foreground">
                    {[
                      s.description,
                      s.base_price != null ? formatToman(s.base_price) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
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

// فرم حالت "از سرویس‌های موجود"
const EMPTY_EXISTING = {
  serviceId: "",
  title: "",        // عنوان سفارش (override)
  extraDesc: "",
  price: "",
  status: "pending" as ServiceOrderStatus,
}

// فرم حالت "سرویس جدید" — همه فیلدهای API
const EMPTY_NEW = {
  // ── اطلاعات سرویس پایه ──
  serviceTitle: "",
  serviceDesc: "",
  basePrice: "",
  mileageInterval: "",
  carModel: "",
  productsNeeded: "",   // comma-separated IDs: "1,2,3"
  // ── اطلاعات سفارش ──
  orderTitle: "",
  extraDesc: "",
  price: "",
  status: "pending" as ServiceOrderStatus,
}

function AddServiceOrderDialog({
  visitId,
  open,
  onOpenChange,
  onAdded,
}: AddServiceOrderDialogProps) {
  const [mode, setMode] = useState<AddMode>("existing")
  const [existingForm, setExistingForm] = useState(EMPTY_EXISTING)
  const [newForm, setNewForm] = useState(EMPTY_NEW)
  const [submitting, setSubmitting] = useState(false)

  const setE = <K extends keyof typeof EMPTY_EXISTING>(
    key: K,
    val: (typeof EMPTY_EXISTING)[K],
  ) => setExistingForm((f) => ({ ...f, [key]: val }))

  const setN = <K extends keyof typeof EMPTY_NEW>(
    key: K,
    val: (typeof EMPTY_NEW)[K],
  ) => setNewForm((f) => ({ ...f, [key]: val }))

  const { data: services = [], isLoading: servicesLoading } = useSWR<Service[]>(
    open ? "garage/services" : null,
    fetchServices,
  )

  function reset() {
    setMode("existing")
    setExistingForm(EMPTY_EXISTING)
    setNewForm(EMPTY_NEW)
  }

  function handleClose(o: boolean) {
    if (!o) reset()
    onOpenChange(o)
  }

  async function handleSubmit() {
    let payload: ServiceOrderPayload

    if (mode === "existing") {
      if (!existingForm.serviceId) {
        toast.error("لطفاً یک سرویس انتخاب کنید")
        return
      }
      payload = {
        id: null,
        service: { id: Number(existingForm.serviceId) },
        title: existingForm.title.trim() || null,
        extra_description: existingForm.extraDesc.trim() || null,
        price: Number(existingForm.price) || 0,
        status: existingForm.status,
      }
    } else {
      if (!newForm.serviceTitle.trim()) {
        toast.error("لطفاً عنوان سرویس را وارد کنید")
        return
      }
      if (!newForm.price.trim()) {
        toast.error("لطفاً قیمت سفارش را وارد کنید")
        return
      }

      // پارس آیدی قطعات (comma-separated)
      const productsNeeded = newForm.productsNeeded
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)

      payload = {
        id: null,
        service: {
          id: null,
          title: newForm.serviceTitle.trim(),
          description: newForm.serviceDesc.trim() || null,
          base_price: newForm.basePrice ? Number(newForm.basePrice) : null,
          mileage_interval: newForm.mileageInterval
            ? Number(newForm.mileageInterval)
            : null,
          car_model: newForm.carModel ? Number(newForm.carModel) : null,
          products_needed: productsNeeded,
        },
        title: newForm.orderTitle.trim() || null,
        extra_description: newForm.extraDesc.trim() || null,
        price: Number(newForm.price),
        status: newForm.status,
      }
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* هدر ثابت */}
        <DialogHeader className="px-6 pt-6 pb-4 text-right shrink-0">
          <DialogTitle>افزودن سرویس به ویزیت</DialogTitle>
        </DialogHeader>

        {/* تاگل حالت */}
        <div className="px-6 pb-4 shrink-0">
          <div className="flex gap-1.5 rounded-xl bg-muted p-1">
            <ModeTab active={mode === "existing"} onClick={() => setMode("existing")}>
              از سرویس‌های موجود
            </ModeTab>
            <ModeTab active={mode === "new"} onClick={() => setMode("new")}>
              سرویس جدید
            </ModeTab>
          </div>
        </div>

        {/* بدنه اسکرول‌پذیر */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {mode === "existing" ? (
            /* ═══ حالت: انتخاب سرویس موجود ═══ */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  سرویس <span className="text-destructive">*</span>
                </Label>
                {servicesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    در حال بارگذاری...
                  </div>
                ) : services.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    هیچ سرویسی تعریف نشده. از حالت «سرویس جدید» استفاده کنید.
                  </p>
                ) : (
                  <ServiceCombobox
                    services={services}
                    value={existingForm.serviceId}
                    onChange={(id) => setE("serviceId", id)}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  عنوان سفارش{" "}
                  <span className="text-xs text-muted-foreground">
                    (اختیاری — جایگزین عنوان سرویس)
                  </span>
                </Label>
                <Input
                  value={existingForm.title}
                  onChange={(e) => setE("title", e.target.value)}
                  placeholder="مثلاً: تعویض روغن موتور سیلک"
                />
              </div>

              <div className="space-y-1.5">
                <Label>قیمت (تومان)</Label>
                <Input
                  inputMode="numeric"
                  value={existingForm.price}
                  onChange={(e) => setE("price", e.target.value.replace(/\D/g, ""))}
                  placeholder="مثلاً: ۵۰۰۰۰۰"
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  توضیح اضافه{" "}
                  <span className="text-xs text-muted-foreground">(اختیاری)</span>
                </Label>
                <Input
                  value={existingForm.extraDesc}
                  onChange={(e) => setE("extraDesc", e.target.value)}
                  placeholder="توضیحات جزئی..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>وضعیت</Label>
                <Select
                  value={existingForm.status}
                  onValueChange={(v) =>
                    v && setE("status", v as ServiceOrderStatus)
                  }
                >
                  <SelectTrigger className="w-full">
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
              </div>
            </div>
          ) : (
            /* ═══ حالت: سرویس جدید — همه فیلدهای API ═══ */
            <div className="space-y-5">
              {/* ── بخش ۱: تعریف سرویس پایه ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  اطلاعات سرویس
                </p>

                <div className="space-y-1.5">
                  <Label>
                    عنوان سرویس <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={newForm.serviceTitle}
                    onChange={(e) => setN("serviceTitle", e.target.value)}
                    placeholder="مثلاً: تعویض تایمینگ"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    توضیحات سرویس{" "}
                    <span className="text-xs text-muted-foreground">(اختیاری)</span>
                  </Label>
                  <Input
                    value={newForm.serviceDesc}
                    onChange={(e) => setN("serviceDesc", e.target.value)}
                    placeholder="شرح کامل سرویس..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      قیمت پایه{" "}
                      <span className="text-xs text-muted-foreground">(تومان)</span>
                    </Label>
                    <Input
                      inputMode="numeric"
                      value={newForm.basePrice}
                      onChange={(e) =>
                        setN("basePrice", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="۰"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      بازه کارکرد{" "}
                      <span className="text-xs text-muted-foreground">(کیلومتر)</span>
                    </Label>
                    <Input
                      inputMode="numeric"
                      value={newForm.mileageInterval}
                      onChange={(e) =>
                        setN("mileageInterval", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="مثلاً: ۵۰۰۰"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    آیدی مدل خودرو{" "}
                    <span className="text-xs text-muted-foreground">(اختیاری)</span>
                  </Label>
                  <Input
                    inputMode="numeric"
                    value={newForm.carModel}
                    onChange={(e) =>
                      setN("carModel", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="مثلاً: ۳"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    قطعات مورد نیاز{" "}
                    <span className="text-xs text-muted-foreground">
                      (اختیاری — آیدی‌ها با ویرگول: ۱,۲,۳)
                    </span>
                  </Label>
                  <Input
                    value={newForm.productsNeeded}
                    onChange={(e) => setN("productsNeeded", e.target.value)}
                    placeholder="1,2,3"
                    dir="ltr"
                  />
                </div>
              </div>

              <Separator />

              {/* ── بخش ۲: اطلاعات سفارش ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  اطلاعات سفارش
                </p>

                <div className="space-y-1.5">
                  <Label>
                    عنوان سفارش{" "}
                    <span className="text-xs text-muted-foreground">
                      (اختیاری — جایگزین عنوان سرویس)
                    </span>
                  </Label>
                  <Input
                    value={newForm.orderTitle}
                    onChange={(e) => setN("orderTitle", e.target.value)}
                    placeholder="مثلاً: تعویض تایمینگ موتور ۴۰۰۰ کیلومتر"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    قیمت سفارش (تومان){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    inputMode="numeric"
                    value={newForm.price}
                    onChange={(e) =>
                      setN("price", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="مثلاً: ۲۵۰۰۰۰۰"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    توضیح اضافه{" "}
                    <span className="text-xs text-muted-foreground">(اختیاری)</span>
                  </Label>
                  <Input
                    value={newForm.extraDesc}
                    onChange={(e) => setN("extraDesc", e.target.value)}
                    placeholder="توضیحات جزئی..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>وضعیت اولیه</Label>
                  <Select
                    value={newForm.status}
                    onValueChange={(v) =>
                      v && setN("status", v as ServiceOrderStatus)
                    }
                  >
                    <SelectTrigger className="w-full">
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* فوتر ثابت */}
        <DialogFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
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
