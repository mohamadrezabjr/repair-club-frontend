"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { createProduct, fetchProductTypes } from "@/lib/api"
import { toEn } from "@/lib/format"
import type { ProductType } from "@/lib/types"

export function AddProductDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [typeId, setTypeId] = useState<string>("")
  const [newType, setNewType] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: types = [] } = useSWR<ProductType[]>(
    open ? "inventory-product-types" : null,
    fetchProductTypes,
    { revalidateOnFocus: false },
  )

  function reset() {
    setName("")
    setPrice("")
    setStock("")
    setTypeId("")
    setNewType("")
    setDescription("")
  }

  async function handleSubmit() {
    const priceNum = Number(toEn(price).replace(/[^\d]/g, ""))
    const stockNum = Number(toEn(stock).replace(/[^\d]/g, ""))
    if (!name.trim()) {
      toast.error("نام کالا را وارد کنید")
      return
    }
    if (!priceNum || priceNum <= 0) {
      toast.error("قیمت فروش معتبر وارد کنید")
      return
    }
    setSaving(true)
    try {
      const productType = newType.trim()
        ? { id: null as null, name: newType.trim() }
        : typeId
          ? { id: Number(typeId) }
          : null
      await createProduct({
        name: name.trim(),
        price: priceNum,
        stock: stockNum || 0,
        description: description.trim() || null,
        product_type: productType,
      })
      toast.success("کالا اضافه شد")
      reset()
      setOpen(false)
      onSuccess?.()
    } catch {
      toast.error("خطا در افزودن کالا")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Plus className="size-4" />
        کالای جدید
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>افزودن کالای جدید</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>نام کالا <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: فیلتر روغن" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>قیمت فروش (تومان) <span className="text-destructive">*</span></Label>
              <Input dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180000" inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>موجودی اولیه</Label>
              <Input dir="ltr" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>نوع کالا</Label>
            <Select value={typeId} onValueChange={(v) => { setTypeId(v ?? ""); setNewType("") }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {typeId ? types.find((t) => String(t.id) === typeId)?.name ?? "بدون نوع" : "بدون نوع"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newType}
              onChange={(e) => { setNewType(e.target.value); if (e.target.value) setTypeId("") }}
              placeholder="یا افزودن نوع جدید…"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label>توضیحات</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اختیاری" rows={2} />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            افزودن کالا
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
