"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import useSWR from "swr"
import { ChevronDown, Edit2, Loader2, Plus, Trash2, UserCircle, Wrench } from "lucide-react"
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
import { formatToman, toFa, SERVICE_ORDER_STATUS_LABEL as SERVICE_ORDER_STATUS_LABEL_SHARED } from "@/lib/format"
import {
  fetchServices,
  fetchStaff,
  submitVisitOrders,
  updateServiceOrder,
  updateServiceOrderStatus,
  deleteServiceOrder,
  type ServiceOrderPayload,
} from "@/lib/api"
import type { Service, ServiceOrder, ServiceOrderStatus, Staff } from "@/lib/types"

// ─── ثوابت ──────────────────────────────────────────────────────────────────

const STATUS_LABEL = SERVICE_ORDER_STATUS_LABEL_SHARED

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
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null)
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
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingOrder(so)}
                    aria-label="ویرایش سرویس"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
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
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">وضعیت:</span>
                <Select
                  value={STATUS_LABEL[so.status]}
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
                    <SelectValue placeholder={STATUS_LABEL[so.status]} />
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

              {/* سرویس‌کاران */}
              {so.staff && so.staff.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCircle className="size-3" />
                  {so.staff.map((s, idx) => (
                    <span key={s.id}>
                      {s.first_name} {s.last_name ?? ""}
                      {idx < so.staff.length - 1 && "، "}
                    </span>
                  ))}
                </div>
              )}
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

      {editingOrder && (
        <EditServiceOrderDialog
          order={editingOrder}
          open={!!editingOrder}
          onOpenChange={(o) => { if (!o) setEditingOrder(null) }}
          onSaved={(updated) => {
            onUpdate(serviceOrders.map((so) => so.id === updated.id ? updated : so))
            setEditingOrder(null)
          }}
        />
      )}
    </div>
  )
}

// ─── سرچ‌باکس سرویس با پشتیبانی از "ایجاد جدید" ─────────────────────────────

interface ServiceSearchProps {
  services: Service[]
  loading: boolean
  /** عنوانی که کاربر تایپ کرده */
  query: string
  onQueryChange: (val: string) => void
  /** سرویس انتخاب‌شده از لیست موجود (یا null اگر هنوز انتخاب نشده یا حالت جدید است) */
  selectedService: Service | null
  onSelectService: (s: Service) => void
  /** کاربر گزینه "ایجاد سرویس جدید" را زد */
  onCreateNew: () => void
}

function ServiceSearchCombobox({
  services,
  loading,
  query,
  onQueryChange,
  selectedService,
  onSelectService,
  onCreateNew,
}: ServiceSearchProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return services.slice(0, 10)
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false),
    )
  }, [services, query])

  function updateDropdownPosition() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const dropdownContent = open ? (
    <div
      style={dropdownStyle}
      className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          در حال بارگذاری...
        </div>
      ) : (
        <ul className="max-h-56 overflow-y-auto">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelectService(s)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-right transition-colors hover:bg-accent",
                  selectedService?.id === s.id && "bg-accent",
                )}
              >
                <span className="font-medium text-sm">{s.title}</span>
                {(s.description || s.base_price != null) && (
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
            </li>
          ))}
          <li>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onCreateNew()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-right text-sm text-primary transition-colors hover:bg-accent"
            >
              <Plus className="size-4 shrink-0" />
              {query.trim()
                ? `ثبت سرویس جدید: «${query.trim()}»`
                : "ثبت سرویس جدید"}
            </button>
          </li>
        </ul>
      )}
    </div>
  ) : null

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setOpen(true)
            updateDropdownPosition()
          }}
          onFocus={() => {
            setOpen(true)
            updateDropdownPosition()
          }}
          placeholder="نام سرویس را جستجو کنید..."
          className="pl-8"
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {typeof document !== "undefined" && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </div>
  )
}

// ─── دیالوگ افزودن سرویس ────────────────────────────────────────────────────

interface AddServiceOrderDialogProps {
  visitId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (allOrders: ServiceOrder[]) => void
}

// فرم مشترک اطلاعات سرویس
const EMPTY_ORDER_FIELDS = {
  title: "",
  extraDesc: "",
  price: "",
  status: "pending" as ServiceOrderStatus,
}

// فرم سرویس جدید
const EMPTY_NEW_SERVICE = {
  serviceTitle: "",
  serviceDesc: "",
  basePrice: "",
  mileageInterval: "",
}

function AddServiceOrderDialog({
  visitId,
  open,
  onOpenChange,
  onAdded,
}: AddServiceOrderDialogProps) {
  // جستجو
  const [query, setQuery] = useState("")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  // حالت: null = هنوز انتخاب نشده، false = موجود انتخاب شد، true = ایجاد جدید
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  const [orderFields, setOrderFields] = useState(EMPTY_ORDER_FIELDS)
  const [newServiceForm, setNewServiceForm] = useState(EMPTY_NEW_SERVICE)
  const [submitting, setSubmitting] = useState(false)
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([])

  const setO = <K extends keyof typeof EMPTY_ORDER_FIELDS>(
    key: K,
    val: (typeof EMPTY_ORDER_FIELDS)[K],
  ) => setOrderFields((f) => ({ ...f, [key]: val }))

  const setNs = <K extends keyof typeof EMPTY_NEW_SERVICE>(
    key: K,
    val: (typeof EMPTY_NEW_SERVICE)[K],
  ) => setNewServiceForm((f) => ({ ...f, [key]: val }))

  const { data: services = [], isLoading: servicesLoading } = useSWR<Service[]>(
    open ? "garage/services" : null,
    fetchServices,
  )

  const { data: staffList = [] } = useSWR<Staff[]>(
    open ? "garage/staff" : null,
    fetchStaff,
  )

  function handleSelectService(s: Service) {
    setSelectedService(s)
    setQuery(s.title)
    setIsCreatingNew(false)
    // پر کردن پیش‌فرض قیمت از سرویس
    if (s.base_price != null) {
      setO("price", String(s.base_price))
    }
  }

  function handleCreateNew() {
    setSelectedService(null)
    setIsCreatingNew(true)
    // عنوان تایپ‌شده رو به فرم جدید منتقل می‌کنیم
    if (query.trim()) {
      setNewServiceForm((f) => ({ ...f, serviceTitle: query.trim() }))
    }
  }

  function handleQueryChange(val: string) {
    setQuery(val)
    // اگه کاربر بعد از انتخاب دوباره تایپ کرد، انتخاب رو پاک کن
    if (selectedService) {
      setSelectedService(null)
    }
    if (isCreatingNew) {
      setNewServiceForm((f) => ({ ...f, serviceTitle: val }))
    }
  }

  function toggleStaff(staffId: number) {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    )
  }

  function reset() {
    setQuery("")
    setSelectedService(null)
    setIsCreatingNew(false)
    setOrderFields(EMPTY_ORDER_FIELDS)
    setNewServiceForm(EMPTY_NEW_SERVICE)
    setSelectedStaffIds([])
  }

  function handleClose(o: boolean) {
    if (!o) reset()
    onOpenChange(o)
  }

  async function handleSubmit() {
    let payload: ServiceOrderPayload

    if (isCreatingNew) {
      const title = newServiceForm.serviceTitle.trim() || query.trim()
      if (!title) {
        toast.error("لطفاً عنوان سرویس را وارد کنید")
        return
      }
      if (!orderFields.price.trim()) {
        toast.error("لطفاً قیمت سفارش را وارد کنید")
        return
      }
      payload = {
        id: null,
        service: {
          id: null,
          title,
          description: newServiceForm.serviceDesc.trim() || null,
          base_price: newServiceForm.basePrice ? Number(newServiceForm.basePrice) : null,
          mileage_interval: newServiceForm.mileageInterval
            ? Number(newServiceForm.mileageInterval)
            : null,
          car_model: null,
          products_needed: [],
        },
        title: orderFields.title.trim() || null,
        extra_description: orderFields.extraDesc.trim() || null,
        price: Number(orderFields.price),
        status: orderFields.status,
        staff: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
      }
    } else {
      if (!selectedService) {
        toast.error("لطفاً یک سرویس انتخاب کنید یا سرویس جدید بسازید")
        return
      }
      if (!orderFields.price.trim()) {
        toast.error("لطفاً قیمت سفارش را وارد کنید")
        return
      }
      payload = {
        id: null,
        service: { id: selectedService.id },
        title: orderFields.title.trim() || null,
        extra_description: orderFields.extraDesc.trim() || null,
        price: Number(orderFields.price),
        status: orderFields.status,
        staff: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
      }
    }

    setSubmitting(true)
    try {
      const updatedVisit = await submitVisitOrders(visitId, { service_orders: [payload] })
      toast.success("سرویس با موفقیت اضافه شد")
      onAdded(updatedVisit.service_orders)
      reset()
    } catch {
      toast.error("خطا در ثبت سرویس. لطفاً دوباره تلاش کنید.")
    } finally {
      setSubmitting(false)
    }
  }

  const showNewServiceForm = isCreatingNew
  const showOrderFields = selectedService !== null || isCreatingNew

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-4 text-right shrink-0">
          <DialogTitle>افزودن سرویس به ویزیت</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
          {/* جستجو / انتخاب سرویس */}
          <div className="space-y-1.5">
            <Label>
              سرویس <span className="text-destructive">*</span>
            </Label>
            <ServiceSearchCombobox
              services={services}
              loading={servicesLoading}
              query={query}
              onQueryChange={handleQueryChange}
              selectedService={selectedService}
              onSelectService={handleSelectService}
              onCreateNew={handleCreateNew}
            />
            {selectedService && (
              <p className="text-xs text-primary">
                سرویس موجود انتخاب شد: {selectedService.title}
              </p>
            )}
            {isCreatingNew && (
              <p className="text-xs text-chart-2">
                سرویس جدید ساخته خواهد شد
              </p>
            )}
          </div>

          {/* فرم اطلاعات سرویس جدید */}
          {showNewServiceForm && (
            <div className="rounded-xl border border-dashed border-chart-2/50 bg-chart-2/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-chart-2">اطلاعات سرویس جدید</p>
              <div className="space-y-1.5">
                <Label>
                  عنوان سرویس <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newServiceForm.serviceTitle}
                  onChange={(e) => setNs("serviceTitle", e.target.value)}
                  placeholder="مثلاً: تعویض تایمینگ"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  توضیحات{" "}
                  <span className="text-xs text-muted-foreground">(اختیاری)</span>
                </Label>
                <Input
                  value={newServiceForm.serviceDesc}
                  onChange={(e) => setNs("serviceDesc", e.target.value)}
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
                    value={newServiceForm.basePrice}
                    onChange={(e) =>
                      setNs("basePrice", e.target.value.replace(/\D/g, ""))
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
                    value={newServiceForm.mileageInterval}
                    onChange={(e) =>
                      setNs("mileageInterval", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="۵۰۰۰"
                  />
                </div>
              </div>
            </div>
          )}

          {/* فیلدهای سفارش — نمایش فقط بعد از انتخاب یا ایجاد */}
          {showOrderFields && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  اطلاعات سفارش
                </p>

                <div className="space-y-1.5">
                  <Label>
                    قیمت (تومان) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    inputMode="numeric"
                    value={orderFields.price}
                    onChange={(e) =>
                      setO("price", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="مثلاً: ۵۰۰۰۰۰"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    عنوان سفارش{" "}
                    <span className="text-xs text-muted-foreground">
                      (اختیاری — جایگزین عنوان سرویس)
                    </span>
                  </Label>
                  <Input
                    value={orderFields.title}
                    onChange={(e) => setO("title", e.target.value)}
                    placeholder="مثلاً: تعویض روغن موتور سیلک"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    توضیح اضافه{" "}
                    <span className="text-xs text-muted-foreground">(اختیاری)</span>
                  </Label>
                  <Input
                    value={orderFields.extraDesc}
                    onChange={(e) => setO("extraDesc", e.target.value)}
                    placeholder="توضیحات جزئی..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>وضعیت</Label>
                  <Select
                    value={STATUS_LABEL[orderFields.status]}
                    onValueChange={(v) =>
                      v && setO("status", v as ServiceOrderStatus)
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

                {/* سرویس‌کاران */}
                {staffList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>
                      سرویس‌کاران{" "}
                      <span className="text-xs text-muted-foreground">(اختیاری)</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {staffList.map((staff) => {
                        const selected = selectedStaffIds.includes(staff.id)
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => toggleStaff(staff.id)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30",
                            )}
                          >
                            <UserCircle className="size-3" />
                            {staff.first_name} {staff.last_name ?? ""}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            انصراف
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!selectedService && !isCreatingNew)}
            className="gap-1.5"
          >
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

// ─── دیالوگ ویرایش سرویس‌اوردر ──────────────────────────────────────────────

interface EditServiceOrderDialogProps {
  order: ServiceOrder
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: (updated: ServiceOrder) => void
}

function EditServiceOrderDialog({
  order,
  open,
  onOpenChange,
  onSaved,
}: EditServiceOrderDialogProps) {
  const [title, setTitle] = useState(order.title ?? "")
  const [price, setPrice] = useState(String(order.price))
  const [extraDesc, setExtraDesc] = useState(order.extra_description ?? "")
  const [status, setStatus] = useState<ServiceOrderStatus>(order.status)
  const [saving, setSaving] = useState(false)

  // sync اگه order از بیرون عوض شد
  useEffect(() => {
    setTitle(order.title ?? "")
    setPrice(String(order.price))
    setExtraDesc(order.extra_description ?? "")
    setStatus(order.status)
  }, [order])

  async function handleSave() {
    if (!price.trim() || Number(price) < 0) {
      toast.error("قیمت باید عدد معتبر باشد")
      return
    }
    setSaving(true)
    try {
      const updated = await updateServiceOrder(order.id, {
        title: title.trim() || null,
        price: Number(price),
        extra_description: extraDesc.trim() || null,
        status,
      })
      toast.success("سرویس بروز شد")
      onSaved(updated)
    } catch {
      toast.error("خطا در ذخیره تغییرات")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ویرایش سرویس</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>
              قیمت (تومان) <span className="text-destructive">*</span>
            </Label>
            <Input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label>عنوان سفارش <span className="text-xs text-muted-foreground">(اختیاری)</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={order.service?.title ?? "عنوان سرویس"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>توضیح اضافه <span className="text-xs text-muted-foreground">(اختیاری)</span></Label>
            <Input
              value={extraDesc}
              onChange={(e) => setExtraDesc(e.target.value)}
              placeholder="توضیحات جزئی..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>وضعیت</Label>
            <Select
              value={STATUS_LABEL[status]}
              onValueChange={(v) => v && setStatus(v as ServiceOrderStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={STATUS_LABEL[status]} />
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
