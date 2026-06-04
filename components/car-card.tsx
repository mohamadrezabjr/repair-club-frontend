"use client"

import { Clock, Package, Trash2, User, Wrench } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Car } from "@/lib/types"
import { toFa, timeAgo } from "@/lib/format"
import { useGarage } from "@/components/garage-provider"
import { LicensePlate } from "@/components/license-plate"

export function CarCard({ car, onOpen }: { car: Car; onOpen: (car: Car) => void }) {
  const { removeCar } = useGarage()

  const doneCount = car.services.filter((s) => s.status === "done").length
  const inProgress = car.services.some((s) => s.status === "in-progress")
  const total = car.services.length

  return (
    <Card
      onClick={() => onOpen(car)}
      className="group cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 p-4">
        <LicensePlate plate={car.plate} size="sm" />
        {inProgress ? (
          <Badge className="border-primary/40 bg-primary/20 text-primary">در حال تعمیر</Badge>
        ) : total > 0 && doneCount === total ? (
          <Badge className="border-chart-3/40 bg-chart-3/20 text-chart-3">آماده تحویل</Badge>
        ) : (
          <Badge variant="secondary">در نوبت</Badge>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold leading-tight">
              {car.brand} {car.model}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {car.color}
              {car.year ? ` • ${toFa(car.year)}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              removeCar(car.id)
            }}
            aria-label="حذف خودرو از گاراژ"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {car.ownerName && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="size-3.5" />
            {car.ownerName}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Wrench className="size-3.5 text-primary" />
            {toFa(doneCount)}/{toFa(total)} سرویس
          </span>
          <span className="flex items-center gap-1.5">
            <Package className="size-3.5 text-chart-2" />
            {toFa(car.parts.length)} قطعه
          </span>
        </div>

        <div className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {timeAgo(car.entryAt)}
        </div>
      </div>
    </Card>
  )
}
