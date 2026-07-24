"use client"

import { useState } from "react"
import useSWR from "swr"
import { History, Loader2, PackagePlus, TrendingDown, TrendingUp } from "lucide-react"
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
import { createStockEntry, fetchProducts, fetchStockEntries } from "@/lib/api"
import { formatToman, toEn, toFa } from "@/lib/format"
import { formatJalaliDate } from "@/lib/jalali"
import type { Product, StockEntry } from "@/lib/types"

/**
 * ورود کالا به انبار (شارژ موجودی یک محصول موجود).
 * - اگر «قیمت جدید» وارد شود، قیمت کالا به همان مقدار به‌روزرسانی می‌شود.
 * - اگر خالی بماند، قیمت فعلی حفظ می‌شود.
 * - هر ورود در تاریخچه ثبت می‌ماند تا روند تغییر قیمت دیده شود.
 */
export function RestockDialog({
  product,
  onSuccess,
  trigger,
}: {
  product?: Product
  onSuccess?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState<string>(product ? String(product.id) : "")
  const [quantity, setQuantity] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [supplier, setSupplier] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: products = [] } = useSWR<Product[]>(
    open && !product ? "inventory-products-picker" : null,
    fetchProducts,
    { revalidateOnFocus: false },
  )

  const selected = product ?? products.find((p) => String(p.id) === productId)

  // تاریخچه‌ی ورود/قیمت برای کالای انتخاب‌شده
  const { data: history = [], mutate: mutateHistory } = useSWR<StockEntry[]>(
    open && selected ? ["stock-history", selected.id] : null,
    () => fetchStockEntries(selected!.id),
    { revalidateOnFocus: false },
  )

  function reset() {
    setProductId(product ? String(product.id) : "")
    setQuantity("")
    setNewPrice("")
    setSupplier("")
  }

  const priceNum = Number(toEn(newPrice).replace(/[^\d]/g, ""))
  const priceDelta = selected && priceNum > 0 ? priceNum - selected.price : 0

  async function handleSubmit() {
    const pid = product ? product.id : Number(productId)
    const qty = Number(toEn(quantity).replace(/[^\d]/g, ""))
    if (!pid) {
      toast.error("کالا را انتخاب کنید")
      return
    }
    if (!qty || qty <= 0) {
      toast.error("تعداد معتبر وارد کنید")
      return
    }
    setSaving(true)
    try {
      await createStockEntry({
        product: pid,
        quantity: qty,
        // اگر قیمت وارد نشده باشد، ارسال نمی‌کنیم تا قیمت قبلی حفظ شود
        ...(priceNum > 0 ? { unit_cost: priceNum } : {}),
        supplier: supplier.trim() || null,
      })
      toast.success(
        priceNum > 0
          ? "ورود کالا ثبت شد و قیمت کالا به‌روزرسانی شد"
          : "ورود کالا ثبت شد (قیمت بدون تغییر)",
      )
      reset()
      mutateHistory()
      setOpen(false)
      onSuccess?.()
    } catch {
      toast.error("خطا در ثبت ورود کالا")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (trigger as React.ReactElement) : <Button size="sm" className="gap-1.5" />
        }
      >
        {trigger ? undefined : (<><PackagePlus className="size-4" />ورود کالا</>)}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ورود کالا به انبار</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {product ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">موجودی فعلی: {toFa(product.stock)} عدد</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">قیمت فعلی</p>
                <p className="text-sm font-bold">{formatToman(product.price)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>کالا <span className="text-destructive">*</span></Label>
              <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{selected ? selected.name : "انتخاب کالا…"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} (موجودی {toFa(p.stock)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>تعداد ورودی <span className="text-destructive">*</span></Label>
              <Input dir="ltr" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>قیمت جدید (تومان)</Label>
              <Input
                dir="ltr"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder={selected ? String(selected.price) : "بدون تغییر"}
                inputMode="numeric"
              />
            </div>
          </div>

          {/* راهنما و اثر تغییر قیمت */}
          {priceNum > 0 && selected ? (
            <div
              className={[
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                priceDelta > 0
                  ? "bg-chart-5/10 text-chart-5"
                  : priceDelta < 0
                    ? "bg-chart-2/10 text-chart-2"
                    : "bg-muted/40 text-muted-foreground",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5">
                {priceDelta > 0 ? <TrendingUp className="size-3.5" /> : priceDelta < 0 ? <TrendingDown className="size-3.5" /> : null}
                قیمت کالا به {formatToman(priceNum)} تغییر می‌کند
              </span>
              {priceDelta !== 0 && (
                <span className="font-medium">
                  {priceDelta > 0 ? "+" : "−"}{formatToman(Math.abs(priceDelta))}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              اگر قیمت را خالی بگذارید، قیمت فعلی کالا حفظ می‌شود.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>تأمین‌کننده</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="اختیاری" />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
            ثبت ورود کالا
          </Button>

          {/* تاریخچه‌ی قیمت و ورود کالا */}
          {selected && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <History className="size-3.5" />
                تاریخچه‌ی قیمت و ورود
              </p>
              {history.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">هنوز ورودی‌ای ثبت نشده است.</p>
              ) : (
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{formatJalaliDate(h.created_at)}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-muted-foreground">+{toFa(h.quantity)} عدد</span>
                        <span className="font-bold">{formatToman(h.unit_cost)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
