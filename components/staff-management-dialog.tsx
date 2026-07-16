"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Plus, Trash2, UserCircle, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { fetchStaff, createStaff, deleteStaff, fetchStaffRoles, createStaffRole } from "@/lib/api"
import type { Staff, StaffRole } from "@/lib/types"

export function StaffManagementDialog() {
  const [open, setOpen] = useState(false)

  const { data: staffList = [], isLoading, mutate } = useSWR<Staff[]>(
    open ? "garage-staff" : null,
    fetchStaff,
    { revalidateOnFocus: false },
  )

  const { data: roles = [], mutate: mutateRoles } = useSWR<StaffRole[]>(
    open ? "garage-staff-roles" : null,
    fetchStaffRoles,
    { revalidateOnFocus: false },
  )

  // Add staff form
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [adding, setAdding] = useState(false)

  // Add role form
  const [newRoleName, setNewRoleName] = useState("")
  const [addingRole, setAddingRole] = useState(false)

  async function handleAddStaff() {
    if (!firstName.trim()) {
      toast.error("لطفاً نام را وارد کنید")
      return
    }
    setAdding(true)
    try {
      await createStaff({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        role: selectedRole ? Number(selectedRole) : null,
      } as any)
      toast.success("سرویس‌کار با موفقیت اضافه شد")
      setFirstName("")
      setLastName("")
      setPhone("")
      setSelectedRole("")
      mutate()
    } catch {
      toast.error("خطا در افزودن سرویس‌کار")
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteStaff(id: number) {
    try {
      await deleteStaff(id)
      toast.success("سرویس‌کار حذف شد")
      mutate()
    } catch {
      toast.error("خطا در حذف سرویس‌کار")
    }
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) {
      toast.error("لطفاً نام نقش را وارد کنید")
      return
    }
    setAddingRole(true)
    try {
      await createStaffRole({ name: newRoleName.trim() })
      toast.success("نقش با موفقیت اضافه شد")
      setNewRoleName("")
      mutateRoles()
    } catch {
      toast.error("خطا در افزودن نقش")
    } finally {
      setAddingRole(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" className="w-full justify-start gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted" />}>
        <Users className="size-4" />
        سرویس‌کاران
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>مدیریت سرویس‌کاران</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── افزودن نقش جدید ── */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground">افزودن نقش جدید</p>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>عنوان نقش</Label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="مثلاً: مکانیک"
                  onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
                />
              </div>
              <Button onClick={handleAddRole} disabled={addingRole} size="sm" className="gap-1.5 shrink-0">
                {addingRole ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                افزودن
              </Button>
            </div>
            {roles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r.id} className="inline-flex rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── فرم افزودن سرویس‌کار ── */}
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-semibold text-primary">افزودن سرویس‌کار جدید</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>نام <span className="text-destructive">*</span></Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="علی" />
              </div>
              <div className="space-y-1.5">
                <Label>نام خانوادگی</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="محمدی" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>شماره تماس</Label>
              <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۳��۵۶۷۸۹" />
            </div>
            <div className="space-y-1.5">
              <Label>نقش</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full">
                  {selectedRole
                    ? roles.find((r) => String(r.id) === selectedRole)?.name ?? "انتخاب نقش..."
                    : "انتخاب نقش..."}
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddStaff} disabled={adding} className="w-full gap-1.5">
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              افزودن سرویس‌کار
            </Button>
          </div>

          {/* ── لیست سرویس‌کاران ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">لیست سرویس‌کاران</p>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : staffList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">هنوز سرویس‌کاری ثبت نشده است.</p>
            ) : (
              <ul className="space-y-1.5">
                {staffList.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCircle className="size-6 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.first_name} {s.last_name ?? ""}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.role?.name ?? "بدون نقش"}
                          {s.phone && ` | ${s.phone}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteStaff(s.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
