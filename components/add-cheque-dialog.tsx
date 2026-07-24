"use client"

import { useState } from "react"
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
import { JalaliDatePicker } from "@/components/jalali-date-picker"
import { createCheque } from "@/lib/api"
import { toEn } from "@/lib/format"
import type { ChequeDirection } from "@/lib/types"

export function AddChequeDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<ChequeDirection>("received")
  const [amount, setAmount] = useState("")
  const [chequeNumber, setChequeNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [counterparty, setCounterparty] = useState("")
  const [dueDate, setDueDate] = useState<string>("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  function reset() {
    setDirection("received")
    setAmount("")
    setChequeNumber("")
    setBankName("")
    setCounterparty("")
    setDueDate("")
    setDescription("")
  }

  async function handleSubmit() {
    const amountNum = Number(toEn(amount).replace(/[^\d]/g, ""))
    if (!amountNum || amountNum <= 0) {
      toast.error("مبلغ معتبر وارد کنید")
      return
    }
    if (!dueDate) {
      toast.error("تاریخ سررسید را انتخاب کنید")
      return
    }
    setSaving(true)
    try {
      await createCheque({
        direction,
        status: "pending",
        amount: amountNum,
        cheque_number: chequeNumber.trim() || null,
        bank_name: bankName.trim() || null,
        counterparty: counterparty.trim() || null,
        due_date: dueDate,
        description: description.trim() || null,
      })
      toast.success("چک ثبت شد")
      reset()
      setOpen(false)
      onSuccess?.()
    } catch {
      toast.error("خطا در ثبت چک")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
        <Plus className="size-4" />
        ثبت چک
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ثبت چک جدید</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("received")}
              className={[
                "h-10 rounded-lg border text-sm font-medium transition-all",
                direction === "received"
                  ? "border-chart-2/60 bg-chart-2/10 text-chart-2"
                  : "border-border text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              دریافتی (از مشتری)
            </button>
            <button
              type="button"
              onClick={() => setDirection("issued")}
              className={[
                "h-10 rounded-lg border text-sm font-medium transition-all",
                direction === "issued"
                  ? "border-chart-5/60 bg-chart-5/10 text-chart-5"
                  : "border-border text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              پرداختی (توسط ما)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مبلغ (تومان) <span className="text-destructive">*</span></Label>
              <Input
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>تاریخ سررسید <span className="text-destructive">*</span></Label>
              <JalaliDatePicker value={dueDate} onChange={setDueDate} placeholder="سررسید" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>شماره چک</Label>
              <Input dir="ltr" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="اختیاری" />
            </div>
            <div className="space-y-1.5">
              <Label>بانک</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مثلاً: ملت" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>طرف حساب</Label>
            <Input
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder={direction === "received" ? "نام مشتری" : "نام تأمین‌کننده"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>توضیحات</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اختیاری" rows={2} />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            ثبت چک
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
