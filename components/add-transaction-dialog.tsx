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
import { JalaliDatePicker } from "@/components/jalali-date-picker"
import {
  createTransaction,
  createTransactionCategory,
  fetchTransactionCategories,
} from "@/lib/api"
import { PAYMENT_METHOD_LABEL } from "@/lib/format"
import { toEn } from "@/lib/format"
import type { PaymentMethod, TransactionCategory, TransactionKind } from "@/lib/types"

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "cheque"]

export function AddTransactionDialog({
  defaultKind = "expense",
  onSuccess,
}: {
  defaultKind?: TransactionKind
  onSuccess?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<TransactionKind>(defaultKind)
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [newCategory, setNewCategory] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [occurredAt, setOccurredAt] = useState<string>(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: categories = [], mutate: mutateCats } = useSWR<TransactionCategory[]>(
    open ? ["accounting-categories", kind] : null,
    () => fetchTransactionCategories(kind),
    { revalidateOnFocus: false },
  )

  function reset() {
    setTitle("")
    setAmount("")
    setCategoryId("")
    setNewCategory("")
    setPaymentMethod("cash")
    setOccurredAt(new Date().toISOString().split("T")[0])
    setDescription("")
  }

  async function handleAddCategory() {
    const name = newCategory.trim()
    if (!name) return
    try {
      const cat = await createTransactionCategory({ name, kind })
      await mutateCats()
      setCategoryId(String(cat.id))
      setNewCategory("")
      toast.success("دسته اضافه شد")
    } catch {
      toast.error("خطا در افزودن دسته")
    }
  }

  async function handleSubmit() {
    const amountNum = Number(toEn(amount).replace(/[^\d]/g, ""))
    if (!title.trim()) {
      toast.error("عنوان را وارد کنید")
      return
    }
    if (!amountNum || amountNum <= 0) {
      toast.error("مبلغ معتبر وارد کنید")
      return
    }
    if (!occurredAt) {
      toast.error("تاریخ را انتخاب کنید")
      return
    }
    setSaving(true)
    try {
      await createTransaction({
        kind,
        title: title.trim(),
        amount: amountNum,
        category: categoryId ? Number(categoryId) : null,
        payment_method: paymentMethod,
        occurred_at: occurredAt,
        description: description.trim() || null,
      })
      toast.success(kind === "income" ? "درآمد ثبت شد" : "هزینه ثبت شد")
      reset()
      setOpen(false)
      onSuccess?.()
    } catch {
      toast.error("خطا در ثبت تراکنش")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        ثبت تراکنش
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ثبت تراکنش مالی</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* نوع تراکنش */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setKind("expense"); setCategoryId("") }}
              className={[
                "h-10 rounded-lg border text-sm font-medium transition-all",
                kind === "expense"
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              هزینه
            </button>
            <button
              type="button"
              onClick={() => { setKind("income"); setCategoryId("") }}
              className={[
                "h-10 rounded-lg border text-sm font-medium transition-all",
                kind === "income"
                  ? "border-chart-2/60 bg-chart-2/10 text-chart-2"
                  : "border-border text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              درآمد
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>عنوان <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "expense" ? "مثلاً: اجاره مغازه" : "مثلاً: فروش نقدی"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مبلغ (تومان) <span className="text-destructive">*</span></Label>
              <Input
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>روش پرداخت</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{PAYMENT_METHOD_LABEL[paymentMethod]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>تاریخ <span className="text-destructive">*</span></Label>
            <JalaliDatePicker value={occurredAt} onChange={setOccurredAt} />
          </div>

          {/* دسته‌بندی */}
          <div className="space-y-1.5">
            <Label>دسته</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {categoryId
                    ? categories.find((c) => String(c.id) === categoryId)?.name ?? "بدون دسته"
                    : "بدون دسته"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-end gap-2 pt-1">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="افزودن دسته جدید…"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddCategory} className="shrink-0 gap-1">
                <Plus className="size-3.5" />
                افزودن
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>توضیحات</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اختیاری"
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            ثبت تراکنش
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
