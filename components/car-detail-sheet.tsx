"use client"

import { useState } from "react"
import {
  CircleDot,
  Clock,
  Mail,
  Package,
  Phone,
  Plus,
  Trash2,
  User,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Car, ServiceStatus } from "@/lib/types"
import { formatToman, toEn, toFa, timeAgo } from "@/lib/format"
import { useGarage } from "@/components/garage-provider"
import { LicensePlate } from "@/components/license-plate"
import { cn } from "@/lib/utils"

const statusConfig: Record<ServiceStatus, { label: string; className: string }> = {
  pending: { label: "در انتظار", className: "bg-muted text-muted-foreground" },
  "in-progress": { label: "در حال انجام", className: "bg-primary/20 text-primary border-primary/40" },
  done: { label: "انجام شد", className: "bg-chart-3/20 text-chart-3 border-chart-3/40" },
}

export function CarDetailSheet({
  car,
  open,
  onOpenChange,
}: {
  car: Car | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addService, updateServiceStatus, removeService, addPart, removePart } = useGarage()
  const [serviceTitle, setServiceTitle] = useState("")
  const [servicePrice, setServicePrice] = useState("")
  const [partName, setPartName] = useState("")
  const [partQty, setPartQty] = useState("")
  const [partPrice, setPartPrice] = useState("")

  if (!car) return null

  const servicesTotal = car.services.reduce((sum, s) => sum + s.price, 0)
  const partsTotal = car.parts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)

  const handleAddService = () => {
    if (!serviceTitle.trim()) return
    addService(car.id, {
      title: serviceTitle.trim(),
      status: "pending",
      price: Number(toEn(servicePrice)) || 0,
    })
    setServiceTitle("")
    setServicePrice("")
  }

  const handleAddPart = () => {
    if (!partName.trim()) return
    addPart(car.id, {
      name: partName.trim(),
      quantity: Number(toEn(partQty)) || 1,
      unitPrice: Number(toEn(partPrice)) || 0,
    })
    setPartName("")
    setPartQty("")
    setPartPrice("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-3 border-b border-border bg-card p-6 text-right">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="text-xl">
                {car.brand} {car.model}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {timeAgo(car.entryAt)} وارد گاراژ شده
              </SheetDescription>
            </div>
            <LicensePlate plate={car.plate} size="md" />
          </div>

          {/* اطلاعات خودرو */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
            <InfoRow label="رنگ" value={car.color || "—"} />
            <InfoRow label="سال ساخت" value={car.year ? toFa(car.year) : "—"} />
            <InfoRow label="مالک" value={car.ownerName || "—"} icon={<User className="size-3.5" />} />
            <InfoRow
              label="تماس"
              value={car.ownerPhone ? toFa(car.ownerPhone) : "—"}
              icon={<Phone className="size-3.5" />}
            />
            {car.ownerEmail && (
              <InfoRow
                label="ایمیل"
                value={car.ownerEmail}
                icon={<Mail className="size-3.5" />}
                className="col-span-2 sm:col-span-3"
              />
            )}
          </div>
          {car.note && (
            <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">یادداشت: </span>
              {car.note}
            </p>
          )}
        </SheetHeader>

        <Tabs defaultValue="services" className="flex-1 p-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services" className="gap-1.5">
              <Wrench className="size-4" />
              سرویس‌ها ({toFa(car.services.length)})
            </TabsTrigger>
            <TabsTrigger value="parts" className="gap-1.5">
              <Package className="size-4" />
              قطعات و کالا ({toFa(car.parts.length)})
            </TabsTrigger>
          </TabsList>

          {/* سرویس‌ها */}
          <TabsContent value="services" className="mt-4 space-y-4">
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <Label>عنوان سرویس</Label>
                <Input
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="مثلاً تعویض روغن و فیلتر"
                  onKeyDown={(e) => e.key === "Enter" && handleAddService()}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>هزینه (تومان)</Label>
                  <Input
                    inputMode="numeric"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(toFa(e.target.value.replace(/\D/g, "")))}
                    placeholder="۸۵۰۰۰۰"
                  />
                </div>
                <Button onClick={handleAddService} className="gap-1.5">
                  <Plus className="size-4" />
                  افزودن
                </Button>
              </div>
            </div>

            {car.services.length === 0 ? (
              <EmptyState text="هنوز سرویسی ثبت نشده است." />
            ) : (
              <ul className="space-y-2">
                {car.services.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <CircleDot
                      className={cn(
                        "size-4 shrink-0",
                        s.status === "done"
                          ? "text-chart-3"
                          : s.status === "in-progress"
                            ? "text-primary"
                            : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{formatToman(s.price)}</p>
                    </div>
                    <Select
                      value={s.status}
                      onValueChange={(v) => updateServiceStatus(car.id, s.id, v as ServiceStatus)}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue>{statusConfig[s.status].label}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">در انتظار</SelectItem>
                        <SelectItem value="in-progress">در حال انجام</SelectItem>
                        <SelectItem value="done">انجام شد</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeService(car.id, s.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* قطعات */}
          <TabsContent value="parts" className="mt-4 space-y-4">
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <Label>نام قطعه / کالا</Label>
                <Input
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="مثلاً لنت ترمز جلو"
                  onKeyDown={(e) => e.key === "Enter" && handleAddPart()}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="w-20 space-y-1.5">
                  <Label>تعداد</Label>
                  <Input
                    inputMode="numeric"
                    value={partQty}
                    onChange={(e) => setPartQty(toFa(e.target.value.replace(/\D/g, "")))}
                    placeholder="۱"
                    className="text-center"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>قیمت واحد (تومان)</Label>
                  <Input
                    inputMode="numeric"
                    value={partPrice}
                    onChange={(e) => setPartPrice(toFa(e.target.value.replace(/\D/g, "")))}
                    placeholder="۱۱۰۰۰۰۰"
                  />
                </div>
                <Button onClick={handleAddPart} className="gap-1.5">
                  <Plus className="size-4" />
                  افزودن
                </Button>
              </div>
            </div>

            {car.parts.length === 0 ? (
              <EmptyState text="هنوز قطعه‌ای ثبت نشده است." />
            ) : (
              <ul className="space-y-2">
                {car.parts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Package className="size-4 shrink-0 text-chart-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {toFa(p.quantity)} عدد × {formatToman(p.unitPrice)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatToman(p.unitPrice * p.quantity)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removePart(car.id, p.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        {/* جمع کل */}
        <div className="border-t border-border bg-card p-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>هزینه سرویس‌ها</span>
            <span>{formatToman(servicesTotal)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
            <span>هزینه قطعات</span>
            <span>{formatToman(partsTotal)}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="font-semibold">مبلغ کل قابل پرداخت</span>
            <span className="text-lg font-bold text-primary">{formatToman(servicesTotal + partsTotal)}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
      <Wrench className="size-6 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
