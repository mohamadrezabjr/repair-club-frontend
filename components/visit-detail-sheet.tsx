"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  Gauge,
  Loader2,
  Package,
  Phone,
  Save,
  User as UserIcon,
  Wrench,
  X,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ServiceOrdersTab } from "@/components/service-orders-tab"
import { ProductOrdersTab } from "@/components/product-orders-tab"
import { VisitFinishModal } from "@/components/visit-finish-modal"
import type {
  ProductOrder,
  ServiceOrder,
  Visit,
  VisitStatus,
} from "@/lib/types"
import { carToPlate } from "@/lib/types"
import {
  formatToman,
  toFa,
  VISIT_STATUS_LABEL,
  TRANSMISSION_TYPE_LABEL,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { LicensePlate } from "@/components/license-plate"
import { updateVisit, updateCar } from "@/lib/api"
import { toast } from "sonner"

// ---- وضعیت‌های ویزیت ----
const VISIT_STATUS_STYLE: Record<VisitStatus, string> = {
  queued:    "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready:     "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
}

const ALL_VISIT_STATUSES: VisitStatus[] = [
  "queued",
  "repairing",
  "ready",
  "delivered",
  "cancelled",
]

// ---- کمک‌ها ----
function carLabelOf(visit: Visit): string {
  const model = visit.car?.model
  if (!model) return "خودروی ناشناس"
  return [model.make, model.model].filter(Boolean).join(" ") || "خودروی ناشناس"
}

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

const FINISHED_STATUSES: VisitStatus[] = ["delivered", "cancelled"]

// ---- کامپوننت اصلی ----
export function VisitDetailSheet({
  visit,
  open,
  onOpenChange,
  onUpdate,
}: {
  visit: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}) {
  // ── سرویس و محصول اوردرهای لوکال ──
  const [localOrders, setLocalOrders] = useState<ServiceOrder[]>(visit?.service_orders ?? [])
  const [localProductOrders, setLocalProductOrders] = useState<ProductOrder[]>(visit?.product_orders ?? [])
  const [localStatus, setLocalStatus] = useState<VisitStatus>(visit?.status ?? "queued")

  // ── ویرایش اطلاعات ویزیت (وضعیت + توضیحات) ──
  const [editingInfo, setEditingInfo] = useState(false)
  const [editDescription, setEditDescription] = useState(visit?.description ?? "")
  const [editStatus, setEditStatus] = useState<VisitStatus>(visit?.status ?? "queued")
  const [savingInfo, setSavingInfo] = useState(false)

  // ── ویرایش اطلاعات فنی ماشین ──
  const [editingCar, setEditingCar] = useState(false)
  const [editCarForm, setEditCarForm] = useState({
    manufacturing_year: "",
    last_mileage: "",
  })
  const [localCar, setLocalCar] = useState(visit?.car ?? null)
  const [savingCar, setSavingCar] = useState(false)

  // ── مودال پایان ویزیت ──
  const [finishModalOpen, setFinishModalOpen] = useState(false)

  // sync وقتی ویزیت از پدر عوض شد
  useEffect(() => {
    setLocalOrders(visit?.service_orders ?? [])
    setLocalProductOrders(visit?.product_orders ?? [])
    setLocalStatus(visit?.status ?? "queued")
    setEditDescription(visit?.description ?? "")
    setEditStatus(visit?.status ?? "queued")
    setEditingInfo(false)
    setLocalCar(visit?.car ?? null)
    setEditingCar(false)
  }, [visit])

  if (!visit) return null

  const { created_at, description } = visit
  const car = localCar

  const carLabel = car?.model
    ? [car.model.make, car.model.model].filter(Boolean).join(" ") || "خودروی ناشناس"
    : "خودروی ناشناس"

  const ownerName = car?.owner?.profile
    ? [car.owner.profile.first_name, car.owner.profile.last_name].filter(Boolean).join(" ")
    : null

  const servicesTotal = localOrders.reduce((sum, s) => sum + s.price, 0)
  const productsTotal = localProductOrders.reduce((sum, p) => sum + p.total_price, 0)
  const isFinished = FINISHED_STATUSES.includes(localStatus)

  // ── ذخیره اطلاعات ویزیت ──
  async function saveInfo() {
    setSavingInfo(true)
    try {
      await updateVisit(visit.id, {
        description: editDescription || null,
        status: editStatus,
      })
      setLocalStatus(editStatus)
      setEditingInfo(false)
      toast.success("اطلاعات ویزیت بروز شد")
      onUpdate?.()
    } catch {
      toast.error("خطا در ذخیره اطلاعات ویزیت")
    } finally {
      setSavingInfo(false)
    }
  }

  function cancelEditInfo() {
    setEditDescription(description ?? "")
    setEditStatus(localStatus)
    setEditingInfo(false)
  }

  // ── شروع ویرایش ماشین ──
  function startEditCar() {
    setEditCarForm({
      manufacturing_year: car?.manufacturing_year != null ? String(car.manufacturing_year) : "",
      last_mileage: car?.last_mileage != null ? String(car.last_mileage) : "",
    })
    setEditingCar(true)
  }

  // ── ذخیره اطلاعات ماشین ──
  async function saveCar() {
    if (!car?.id) return
    setSavingCar(true)
    try {
      const updated = await updateCar(car.id, {
        manufacturing_year: editCarForm.manufacturing_year
          ? Number(editCarForm.manufacturing_year)
          : undefined,
        last_mileage: editCarForm.last_mileage
          ? Number(editCarForm.last_mileage)
          : undefined,
      })
      setLocalCar((prev) => prev ? { ...prev, ...updated } : prev)
      setEditingCar(false)
      toast.success("اطلاعات خودرو بروز شد")
      onUpdate?.()
    } catch {
      toast.error("خطا در ذخیره اطلاعات خودرو")
    } finally {
      setSavingCar(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          dir="rtl"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
        >
          {/* ---- هدر ---- */}
          <SheetHeader className="space-y-3 border-b border-border bg-card p-6 text-right">

            {/* ردیف عنوان + وضعیت */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl">{carLabel}</SheetTitle>
                <SheetDescription className="mt-1 flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" />
                  {formatDate(created_at)}
                </SheetDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className={cn("shrink-0", VISIT_STATUS_STYLE[localStatus])}>
                  {VISIT_STATUS_LABEL[localStatus]}
                </Badge>
                {!editingInfo && !editingCar && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => setEditingInfo(true)}
                    aria-label="ویرایش اطلاعات ویزیت"
                  >
                    <Edit2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* ── کارت اطلاعات ماشین ── */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              {/* هدر کارت ماشین */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  مشخصات خودرو
                </span>
                {!editingCar && !editingInfo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={startEditCar}
                  >
                    <Edit2 className="size-3.5" />
                    ویرایش
                  </Button>
                )}
              </div>

              {/* پلاک */}
              {(() => {
                const plate = carToPlate(car)
                return plate ? (
                  <LicensePlate plate={plate} />
                ) : (
                  <p className="text-xs text-muted-foreground">پلاک ثبت نشده</p>
                )
              })()}

              {!editingCar ? (
                /* ── نمایش فقط‌خواندنی ── */
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  {car?.model?.make && (
                    <InfoRow label="سازنده" value={car.model.make} />
                  )}
                  {car?.model?.model && (
                    <InfoRow label="مدل" value={car.model.model} />
                  )}
                  {car?.model?.transmission_type && (
                    <InfoRow
                      label="گیربکس"
                      value={TRANSMISSION_TYPE_LABEL[car.model.transmission_type]}
                    />
                  )}
                  {car?.manufacturing_year != null && (
                    <InfoRow label="سال تولید" value={toFa(car.manufacturing_year)} />
                  )}
                  {car?.last_mileage != null && (
                    <InfoRow
                      label="کارکرد"
                      value={`${toFa(car.last_mileage)} کیلومتر`}
                      icon={<Gauge className="size-3.5" />}
                    />
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
              ) : (
                /* ── فرم ویرایش ماشین ── */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        سال تولید
                      </label>
                      <Input
                        inputMode="numeric"
                        value={editCarForm.manufacturing_year}
                        onChange={(e) =>
                          setEditCarForm((f) => ({
                            ...f,
                            manufacturing_year: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        placeholder="۱۴۰۰"
                        className="h-9 bg-background text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        کارکرد (کیلومتر)
                      </label>
                      <Input
                        inputMode="numeric"
                        value={editCarForm.last_mileage}
                        onChange={(e) =>
                          setEditCarForm((f) => ({
                            ...f,
                            last_mileage: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        placeholder="۵۰۰۰۰"
                        className="h-9 bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCar(false)}
                      disabled={savingCar}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <X className="size-3.5" />
                      انصراف
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveCar}
                      disabled={savingCar}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {savingCar ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      ذخیره
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── فرم ویرایش ویزیت ── */}
            {editingInfo && (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    وضعیت ویزیت
                  </label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as VisitStatus)}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder={VISIT_STATUS_LABEL[editStatus]} />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_VISIT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {VISIT_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    توضیحات
                  </label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="توضیحات ویزیت..."
                    className="min-h-[80px] resize-none bg-background text-sm"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditInfo}
                    disabled={savingInfo}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <X className="size-3.5" />
                    انصراف
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {savingInfo ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    ذخیره
                  </Button>
                </div>
              </div>
            )}

            {/* توضیحات read-only */}
            {!editingInfo && (description || editDescription) && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="leading-relaxed text-muted-foreground">
                  {editDescription || description}
                </p>
              </div>
            )}

            {/* دکمه پایان ویزیت */}
            {!isFinished && !editingInfo && !editingCar && (
              <Button
                onClick={() => setFinishModalOpen(true)}
                className="w-full gap-2 font-semibold"
                variant="default"
              >
                <CheckCircle2 className="size-4" />
                پایان ویزیت
              </Button>
            )}
          </SheetHeader>

          {/* ---- تب‌ها ---- */}
          <Tabs defaultValue="services" className="flex-1 p-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="services" className="gap-1.5">
                <Wrench className="size-4" />
                سرویس‌ها ({toFa(localOrders.length)})
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-1.5">
                <Package className="size-4" />
                قطعات و کالا ({toFa(localProductOrders.length)})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="mt-4">
              <ServiceOrdersTab
                visitId={visit.id}
                serviceOrders={localOrders}
                onUpdate={(updated) => {
                  setLocalOrders(updated)
                  onUpdate?.()
                }}
              />
            </TabsContent>

            <TabsContent value="products" className="mt-4">
              <ProductOrdersTab
                visitId={visit.id}
                productOrders={localProductOrders}
                onUpdate={(updated) => {
                  setLocalProductOrders(updated)
                  onUpdate?.()
                }}
              />
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

      {/* ---- مودال پایان ویزیت ---- */}
      <VisitFinishModal
        open={finishModalOpen}
        onOpenChange={setFinishModalOpen}
        visit={visit}
        serviceOrders={localOrders}
        productOrders={localProductOrders}
        onFinished={(updatedOrders, newStatus) => {
          setLocalOrders(updatedOrders)
          setLocalStatus(newStatus)
          onUpdate?.()
        }}
      />
    </>
  )
}

// ---- کامپوننت کمکی ----
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
