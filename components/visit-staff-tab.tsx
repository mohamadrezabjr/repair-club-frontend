"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, UserCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { fetchStaff, updateVisit } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Staff, Visit } from "@/lib/types"

interface VisitStaffTabProps {
  visit: Visit
  onUpdate: () => void
}

export function VisitStaffTab({ visit, onUpdate }: VisitStaffTabProps) {
  const { data: staffList = [], isLoading } = useSWR<Staff[]>(
    "garage-visit-staff",
    fetchStaff,
    { revalidateOnFocus: false },
  )

  const [selectedIds, setSelectedIds] = useState<number[]>(
    visit.staff?.map((s) => s.id) ?? [],
  )
  const [saving, setSaving] = useState(false)

  async function toggleStaff(staffId: number) {
    setSelectedIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateVisit(visit.id, { staff: selectedIds } as any)
      toast.success("سرویس‌کاران ویزیت بروز شدند")
      onUpdate()
    } catch {
      toast.error("خطا در ذخیره سرویس‌کاران")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">
        سرویس‌کارانی که روی این ماشین کار کرده‌اند را انتخاب کنید
      </p>

      {staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <UserCircle className="size-6 opacity-50" />
          <p className="text-sm">هنوز سرویس‌کاری ثبت نشده است.</p>
          <p className="text-xs">از منوی اصلی &rarr; سرویس‌کاران را ثبت کنید</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {staffList.map((staff) => {
            const selected = selectedIds.includes(staff.id)
            return (
              <button
                key={staff.id}
                type="button"
                onClick={() => toggleStaff(staff.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30",
                )}
              >
                <UserCircle className="size-4" />
                {staff.first_name} {staff.last_name ?? ""}
                {staff.role && (
                  <span className="text-xs opacity-60">({staff.role.name})</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {staffList.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="gap-1.5"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          ذخیره سرویس‌کاران
        </Button>
      )}
    </div>
  )
}
