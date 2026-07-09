"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import useSWR from "swr"
import { ChevronDown, Edit2, Loader2, Package, Plus, Trash2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { formatToman, toFa } from "@/lib/format"
import {
  fetchProducts,
  fetchProductTypes,
  submitVisitOrders,
  updateProductOrder,
  deleteProductOrder,
  type ProductOrderPayload,
  type ProductTypePayload,
} from "@/lib/api"
import type { Product, ProductOrder, ProductType } from "@/lib/types"

// ─── کامپوننت اصلی: لیست کالاهای ویزیت ─────────────────────────────────────

interface ProductOrdersTabProps {
  visitId: number
  productOrders: ProductOrder[]
  onUpdate: (updatedOrders: ProductOrder[]) => void
}

export function ProductOrdersTab({
  visitId,
  productOrders,
  onUpdate,
}: ProductOrdersTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ProductOrder | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleDelete(orderId: number) {
    setDeletingId(orderId)
    try {
      await deleteProductOrder(orderId)
      onUpdate(productOrders.filter((po) => po.id !== orderId))
      toast.success("کالا حذف شد")
    } catch {
      toast.error("خطا در حذف کالا")
    } finally {
      setDeletingId(null)
    }
  }

  function handleAdded(allOrders: ProductOrder[]) {
    onUpdate(allOrders)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          افزودن کالا
        </Button>
      </div>

      {productOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Package className="size-6 opacity-50" />
          <p className="text-sm">هنوز کالایی ثبت نشده است.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {productOrders.map((po) => (
            <li
              key={po.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Package className="size-4 shrink-0 text-chart-2" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {po.product?.name ?? "کالای ناشناس"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {toFa(po.quantity)} عدد
                  {po.product?.product_type?.name
                    ? ` · ${po.product.product_type.name}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-sm font-semibold ml-1">
                  {formatToman(
                    Number(po.total_price) ||
                      (po.product ? Number(po.product.price) * po.quantity : 0),
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingOrder(po)}
                  aria-label="ویرایش کالا"
                >
                  <Edit2 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(po.id)}
                  disabled={deletingId === po.id}
                >
                  {deletingId === po.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddProductOrderDialog
        visitId={visitId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdded={handleAdded}
      />

      {editingOrder && (
        <EditProductOrderDialog
          order={editingOrder}
          open={!!editingOrder}
          onOpenChange={(o) => { if (!o) setEditingOrder(null) }}
          onSaved={(updated) => {
            onUpdate(productOrders.map((po) => po.id === updated.id ? updated : po))
            setEditingOrder(null)
          }}
        />
      )}
    </div>
  )
}

// ─── سرچ‌باکس کالا با پشتیبانی از "ایجاد جدید" ───────────────────────────────

interface ProductSearchComboboxProps {
  products: Product[]
  loading: boolean
  query: string
  onQueryChange: (val: string) => void
  selectedProduct: Product | null
  onSelectProduct: (p: Product) => void
  onCreateNew: () => void
}

function ProductSearchCombobox({
  products,
  loading,
  query,
  onQueryChange,
  selectedProduct,
  onSelectProduct,
  onCreateNew,
}: ProductSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 10)
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.product_type?.name.toLowerCase().includes(q) ?? false),
    )
  }, [products, query])

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
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelectProduct(p)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-right transition-colors hover:bg-accent",
                  selectedProduct?.id === p.id && "bg-accent",
                )}
              >
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[
                    p.product_type?.name,
                    formatToman(p.price),
                    p.stock != null ? `موجودی: ${toFa(p.stock)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
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
                ? `ثبت کالای جدید: «${query.trim()}»`
                : "ثبت کالای جدید"}
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
          placeholder="نام کالا را جستجو کنید..."
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

// ─── سرچ‌باکس نوع کالا با پشتیبانی از "ایجاد جدید" ──────────────────────────

interface ProductTypeSearchComboboxProps {
  productTypes: ProductType[]
  loading: boolean
  query: string
  onQueryChange: (val: string) => void
  selectedType: ProductType | null
  onSelectType: (t: ProductType) => void
  onCreateNew: () => void
}

function ProductTypeSearchCombobox({
  productTypes,
  loading,
  query,
  onQueryChange,
  selectedType,
  onSelectType,
  onCreateNew,
}: ProductTypeSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return productTypes.slice(0, 10)
    return productTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false),
    )
  }, [productTypes, query])

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
        <ul className="max-h-48 overflow-y-auto">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelectType(t)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-right transition-colors hover:bg-accent",
                  selectedType?.id === t.id && "bg-accent",
                )}
              >
                <span className="font-medium text-sm">{t.name}</span>
                {t.description && (
                  <span className="text-xs text-muted-foreground">{t.description}</span>
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
                ? `ثبت نوع کالای جدید: «${query.trim()}»`
                : "ثبت نوع کالای جدید"}
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
          placeholder="نوع کالا را جستجو کنید..."
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

// ─── دیالوگ افزودن کالا ──────────────────────────────────────────────────────

interface AddProductOrderDialogProps {
  visitId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (allOrders: ProductOrder[]) => void
}

const EMPTY_NEW_PRODUCT_FORM = {
  productName: "",
  productPrice: "",
  productStock: "",
  productDesc: "",
}

const EMPTY_NEW_TYPE_FORM = {
  typeName: "",
  typeDesc: "",
}

function AddProductOrderDialog({
  visitId,
  open,
  onOpenChange,
  onAdded,
}: AddProductOrderDialogProps) {
  // جستجوی کالا
  const [productQuery, setProductQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)

  // جستجوی نوع کالا (فقط وقتی کالای جدید می‌سازیم)
  const [typeQuery, setTypeQuery] = useState("")
  const [selectedType, setSelectedType] = useState<ProductType | null>(null)
  const [isCreatingType, setIsCreatingType] = useState(false)

  // فر�� محصول جدید
  const [newProductForm, setNewProductForm] = useState(EMPTY_NEW_PRODUCT_FORM)
  // فرم نوع کالا جدید
  const [newTypeForm, setNewTypeForm] = useState(EMPTY_NEW_TYPE_FORM)

  // تعداد
  const [quantity, setQuantity] = useState("1")

  const [submitting, setSubmitting] = useState(false)

  const setNp = <K extends keyof typeof EMPTY_NEW_PRODUCT_FORM>(
    key: K,
    val: (typeof EMPTY_NEW_PRODUCT_FORM)[K],
  ) => setNewProductForm((f) => ({ ...f, [key]: val }))

  const setNt = <K extends keyof typeof EMPTY_NEW_TYPE_FORM>(
    key: K,
    val: (typeof EMPTY_NEW_TYPE_FORM)[K],
  ) => setNewTypeForm((f) => ({ ...f, [key]: val }))

  const { data: products = [], isLoading: productsLoading } = useSWR<Product[]>(
    open ? "inventory/products" : null,
    fetchProducts,
  )

  const { data: productTypes = [], isLoading: typesLoading } = useSWR<ProductType[]>(
    open && isCreatingProduct ? "inventory/product_types" : null,
    fetchProductTypes,
  )

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p)
    setProductQuery(p.name)
    setIsCreatingProduct(false)
  }

  function handleCreateNewProduct() {
    setSelectedProduct(null)
    setIsCreatingProduct(true)
    if (productQuery.trim()) {
      setNewProductForm((f) => ({ ...f, productName: productQuery.trim() }))
    }
  }

  function handleProductQueryChange(val: string) {
    setProductQuery(val)
    if (selectedProduct) setSelectedProduct(null)
    if (isCreatingProduct) setNewProductForm((f) => ({ ...f, productName: val }))
  }

  function handleSelectType(t: ProductType) {
    setSelectedType(t)
    setTypeQuery(t.name)
    setIsCreatingType(false)
  }

  function handleCreateNewType() {
    setSelectedType(null)
    setIsCreatingType(true)
    if (typeQuery.trim()) {
      setNewTypeForm((f) => ({ ...f, typeName: typeQuery.trim() }))
    }
  }

  function handleTypeQueryChange(val: string) {
    setTypeQuery(val)
    if (selectedType) setSelectedType(null)
    if (isCreatingType) setNewTypeForm((f) => ({ ...f, typeName: val }))
  }

  function reset() {
    setProductQuery("")
    setSelectedProduct(null)
    setIsCreatingProduct(false)
    setTypeQuery("")
    setSelectedType(null)
    setIsCreatingType(false)
    setNewProductForm(EMPTY_NEW_PRODUCT_FORM)
    setNewTypeForm(EMPTY_NEW_TYPE_FORM)
    setQuantity("1")
  }

  function handleClose(o: boolean) {
    if (!o) reset()
    onOpenChange(o)
  }

  async function handleSubmit() {
    const qty = Number(quantity)
    if (!qty || qty < 1) {
      toast.error("تعداد باید حداقل ۱ باشد")
      return
    }

    // بررسی موجودی کافی برای کالای موجود
    if (selectedProduct && selectedProduct.stock != null && qty > selectedProduct.stock) {
      toast.error(`موجودی کافی نیست. حداکثر ${toFa(selectedProduct.stock)} عدد قابل ثبت است.`)
      return
    }

    let productPayload: ProductOrderPayload["product"]

    if (isCreatingProduct) {
      const name = newProductForm.productName.trim() || productQuery.trim()
      if (!name) {
        toast.error("لطفاً نام کالا را وارد کنید")
        return
      }
      if (!newProductForm.productPrice.trim()) {
        toast.error("لطفاً قیمت کالا را وارد کنید")
        return
      }

      // تعیین نوع کالا
      let productTypePayload: ProductTypePayload
      if (isCreatingType) {
        const typeName = newTypeForm.typeName.trim() || typeQuery.trim()
        if (!typeName) {
          toast.error("لطفاً نام نوع کالا را وارد کنید")
          return
        }
        productTypePayload = {
          id: null,
          name: typeName,
          description: newTypeForm.typeDesc.trim() || null,
        }
      } else if (selectedType) {
        productTypePayload = { id: selectedType.id }
      } else {
        toast.error("لطفاً نوع کالا را انتخاب یا ایجاد کنید")
        return
      }

      productPayload = {
        id: null,
        product_type: productTypePayload,
        name,
        price: Number(newProductForm.productPrice),
        stock: newProductForm.productStock ? Number(newProductForm.productStock) : undefined,
        description: newProductForm.productDesc.trim() || null,
      }
    } else if (selectedProduct) {
      productPayload = { id: selectedProduct.id }
    } else {
      toast.error("لطفاً یک کالا انتخاب یا ایجاد کنید")
      return
    }

    const payload: ProductOrderPayload = { product: productPayload, quantity: qty }

    setSubmitting(true)
    try {
      const updatedVisit = await submitVisitOrders(visitId, { product_orders: [payload] })
      toast.success("کالا با موفقیت اضافه شد")
      onAdded(updatedVisit.product_orders)
      reset()
    } catch (err: unknown) {
      // بررسی خطای موجودی ناکافی از سمت بک‌اند
      const apiErr = err as { response?: { data?: { quantity?: string } } }
      const quantityMsg = apiErr?.response?.data?.quantity
      if (quantityMsg && quantityMsg.toLowerCase().includes("stock")) {
        toast.error("موجودی کافی نیست. تعداد درخواستی از موجودی انبار بیشتر است.")
      } else {
        toast.error("خطا در ثبت کالا. لطفاً دوباره تلاش کنید.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const showProductDetails = selectedProduct !== null || isCreatingProduct
  const showTypeSection = isCreatingProduct

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-4 text-right shrink-0">
          <DialogTitle>افزودن کالا به ویزیت</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
          {/* جستجو / انتخاب کالا */}
          <div className="space-y-1.5">
            <Label>
              کالا <span className="text-destructive">*</span>
            </Label>
            <ProductSearchCombobox
              products={products}
              loading={productsLoading}
              query={productQuery}
              onQueryChange={handleProductQueryChange}
              selectedProduct={selectedProduct}
              onSelectProduct={handleSelectProduct}
              onCreateNew={handleCreateNewProduct}
            />
            {selectedProduct && (
              <p className="text-xs text-primary">
                کالای موجود انتخاب شد: {selectedProduct.name}
                {selectedProduct.product_type && ` (${selectedProduct.product_type.name})`}
              </p>
            )}
            {isCreatingProduct && (
              <p className="text-xs text-chart-2">
                کالای جدید ساخته خواهد شد
              </p>
            )}
          </div>

          {/* بخش نوع کالا — فقط برای کالای جدید */}
          {showTypeSection && (
            <div className="rounded-xl border border-dashed border-chart-2/50 bg-chart-2/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-chart-2">اطلاعات کالای جدید</p>

              {/* نام کالا */}
              <div className="space-y-1.5">
                <Label>
                  نام کالا <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newProductForm.productName}
                  onChange={(e) => setNp("productName", e.target.value)}
                  placeholder="مثلاً: فیلتر روغن سرکان"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    قیمت (تومان) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    inputMode="numeric"
                    value={newProductForm.productPrice}
                    onChange={(e) =>
                      setNp("productPrice", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="۱۲۰۰۰۰"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    موجودی{" "}
                    <span className="text-xs text-muted-foreground">(اختیاری)</span>
                  </Label>
                  <Input
                    inputMode="numeric"
                    value={newProductForm.productStock}
                    onChange={(e) =>
                      setNp("productStock", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="۵۰"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  توضیحات{" "}
                  <span className="text-xs text-muted-foreground">(اختیاری)</span>
                </Label>
                <Input
                  value={newProductForm.productDesc}
                  onChange={(e) => setNp("productDesc", e.target.value)}
                  placeholder="شرح کالا..."
                />
              </div>

              <Separator />

              {/* نوع کالا */}
              <div className="space-y-1.5">
                <Label>
                  نوع کالا <span className="text-destructive">*</span>
                </Label>
                <ProductTypeSearchCombobox
                  productTypes={productTypes}
                  loading={typesLoading}
                  query={typeQuery}
                  onQueryChange={handleTypeQueryChange}
                  selectedType={selectedType}
                  onSelectType={handleSelectType}
                  onCreateNew={handleCreateNewType}
                />
                {selectedType && (
                  <p className="text-xs text-primary">
                    نوع کالا انتخاب شد: {selectedType.name}
                  </p>
                )}
                {isCreatingType && (
                  <p className="text-xs text-chart-2">نوع کالای جدید ساخته خواهد شد</p>
                )}
              </div>

              {/* فرم نوع کالا جدید */}
              {isCreatingType && (
                <div className="space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                  <div className="space-y-1.5">
                    <Label>
                      نام نوع کالا <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={newTypeForm.typeName}
                      onChange={(e) => setNt("typeName", e.target.value)}
                      placeholder="مثلاً: فیلتر روغن"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      توضیحات{" "}
                      <span className="text-xs text-muted-foreground">(اختیاری)</span>
                    </Label>
                    <Input
                      value={newTypeForm.typeDesc}
                      onChange={(e) => setNt("typeDesc", e.target.value)}
                      placeholder="شرح نوع کالا..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تعداد — نمایش بعد از انتخاب یا ایجاد */}
          {showProductDetails && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label>
                  تعداد <span className="text-destructive">*</span>
                </Label>
                <Input
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="۱"
                  dir="ltr"
                  className={cn(
                    "w-32",
                    selectedProduct?.stock != null &&
                      Number(quantity) > selectedProduct.stock &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {selectedProduct?.stock != null && (
                  <p
                    className={cn(
                      "text-xs",
                      Number(quantity) > selectedProduct.stock
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    موجودی انبار: {toFa(selectedProduct.stock)} عدد
                  </p>
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
            disabled={submitting || (!selectedProduct && !isCreatingProduct)}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              "افزودن کالا"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── دیالوگ ویرایش product_order ────────────────────────────────────────────

interface EditProductOrderDialogProps {
  order: ProductOrder
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: (updated: ProductOrder) => void
}

function EditProductOrderDialog({
  order,
  open,
  onOpenChange,
  onSaved,
}: EditProductOrderDialogProps) {
  const [quantity, setQuantity] = useState(String(order.quantity))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setQuantity(String(order.quantity))
  }, [order])

  async function handleSave() {
    const qty = Number(quantity)
    if (!qty || qty < 1) {
      toast.error("تعداد باید حداقل ۱ باشد")
      return
    }
    if (
      order.product?.stock != null &&
      qty > order.product.stock + order.quantity
    ) {
      toast.error(
        `موجودی کافی نیست. حداکثر ${toFa(order.product.stock + order.quantity)} عدد قابل ثبت است.`,
      )
      return
    }
    setSaving(true)
    try {
      const updated = await updateProductOrder(order.id, { quantity: qty })
      toast.success("کالا بروز شد")
      onSaved(updated)
    } catch {
      toast.error("خطا در ذخیره تغییرات")
    } finally {
      setSaving(false)
    }
  }

  const productName = order.product?.name ?? "کالا"
  const unitPrice = order.product ? order.total_price / order.quantity : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ویرایش کالا</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm font-medium">
            {productName}
            {order.product?.product_type && (
              <span className="mr-1.5 text-xs font-normal text-muted-foreground">
                ({order.product.product_type.name})
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              تعداد <span className="text-destructive">*</span>
            </Label>
            <Input
              inputMode="numeric"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value.replace(/\D/g, ""))
              }
              dir="ltr"
              className="w-32"
            />
            {order.product?.stock != null && (
              <p className="text-xs text-muted-foreground">
                موجودی انبار: {toFa(order.product.stock + order.quantity)} عدد
              </p>
            )}
            {unitPrice > 0 && Number(quantity) > 0 && (
              <p className="text-xs text-muted-foreground">
                جمع: {formatToman(unitPrice * Number(quantity))}
              </p>
            )}
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
