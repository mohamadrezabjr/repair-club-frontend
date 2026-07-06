"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Camera, CameraOff, Check, ChevronDown, Loader2,
  Plus, Search, Trash2, X, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  PLATE_LETTERS,
  type ApiCar, type ApiCarModel, type ApiUser,
  type Service, type Product, type ServiceOrderStatus,
} from "@/lib/types"
import { toFa } from "@/lib/format"
import { LicensePlate } from "@/components/license-plate"
import { useGarage } from "@/components/garage-provider"
import {
  fetchCars, fetchModels, fetchServices, fetchProducts,
  fetchUserByPhone,
  createVisitMega,
  type MegaVisitPayload,
  type MegaServiceOrderPayload,
  type MegaProductOrderPayload,
  type MegaCarPayload,
  type MegaCarModelPayload,
  type MegaServicePayload,
  type MegaProductPayload,
} from "@/lib/api"
import { ocrLicensePlate, captureFrame } from "@/lib/ocr"

// ─── helpers ──────────────────────────────────────────────────────────────────

const emptyPlate = { twoDigits: "", letter: "ب", threeDigits: "", region: "" }
const emptyModelForm = { make: "", model: "", model_year: "", transmission_type: "man" as "man" | "auto" }
const emptyOwnerForm = { phone: "", firstName: "", lastName: "", email: "" }

// ─── local types ──────────────────────────────────────────────────────────────

interface LocalServiceOrder {
  _key: string
  // سرویس موجود یا جدید
  existingService: Service | null
  isNewService: boolean
  newServiceTitle: string
  newServiceDescription: string
  newServiceBasePrice: string
  // فیلدهای order
  title: string
  extraDescription: string
  price: string
  status: ServiceOrderStatus
}

interface LocalProductOrder {
  _key: string
  existingProduct: Product | null
  isNewProduct: boolean
  newProductName: string
  newProductPrice: string
  newProductStock: string
  newProductDescription: string
  // نوع محصول برای محصول جدید
  newProductTypeName: string
  quantity: string
}

type Step = "car" | "orders"

// ─── sanitizeData ──────────────────────────────────────────────────────────────

function buildCarPayload(
  existingCar: ApiCar | null,
  plate: typeof emptyPlate,
  ownerPhone: string,
  existingModel: ApiCarModel | null,
  isNewModel: boolean,
  modelForm: typeof emptyModelForm,
  year: string,
  mileage: string,
): MegaCarPayload {
  if (existingCar) return { id: existingCar.id }

  const modelPayload: MegaCarModelPayload = existingModel && !isNewModel
    ? { id: existingModel.id }
    : {
        make: modelForm.make,
        model: modelForm.model,
        model_year: Number(modelForm.model_year),
        transmission_type: modelForm.transmission_type,
      }

  return {
    owner: ownerPhone,
    model: modelPayload,
    in_garage: true,
    plate_first: Number(plate.twoDigits),
    plate_letter: plate.letter,
    plate_second: Number(plate.threeDigits),
    plate_region: Number(plate.region),
    ...(year ? { manufacturing_year: Number(year) } : {}),
    ...(mileage ? { last_mileage: Number(mileage) } : {}),
  }
}

function buildServiceOrders(orders: LocalServiceOrder[]): MegaServiceOrderPayload[] {
  return orders.map((o) => {
    const servicePayload: MegaServicePayload = o.existingService && !o.isNewService
      ? { id: o.existingService.id }
      : {
          title: o.newServiceTitle,
          description: o.newServiceDescription || undefined,
          base_price: o.newServiceBasePrice ? Number(o.newServiceBasePrice) : undefined,
        }

    return {
      service: servicePayload,
      title: o.title || undefined,
      extra_description: o.extraDescription || undefined,
      price: Number(o.price) || 0,
      status: o.status,
    }
  })
}

function buildProductOrders(orders: LocalProductOrder[]): MegaProductOrderPayload[] {
  return orders.map((o) => {
    const productPayload: MegaProductPayload = o.existingProduct && !o.isNewProduct
      ? { id: o.existingProduct.id }
      : {
          name: o.newProductName,
          price: Number(o.newProductPrice) || 0,
          stock: o.newProductStock ? Number(o.newProductStock) : undefined,
          description: o.newProductDescription || undefined,
          product_type: o.newProductTypeName
            ? { name: o.newProductTypeName }
            : { name: "عمومی" },
        }

    return {
      quantity: Number(o.quantity) || 1,
      product: productPayload,
    }
  })
}

// ─── component ────────────────────────────────────────────────────────────────

export function AddCarDialog({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { addCar } = useGarage()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("car")

  // ── مرحله ۱: خودرو ──────────────────────────────────────────
  const [plate, setPlate] = useState(emptyPlate)
  const setPl = (k: keyof typeof emptyPlate, v: string) => setPlate((p) => ({ ...p, [k]: v }))

  // جستجوی خودرو
  const [allCars, setAllCars] = useState<ApiCar[]>([])
  const [carsLoading, setCarsLoading] = useState(false)
  const [plateDropOpen, setPlateDropOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState<ApiCar | null>(null)

  // مدل
  const [allModels, setAllModels] = useState<ApiCarModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const [modelDropOpen, setModelDropOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ApiCarModel | null>(null)
  const [isNewModel, setIsNewModel] = useState(false)
  const [modelForm, setModelForm] = useState(emptyModelForm)
  const setMf = (k: keyof typeof emptyModelForm, v: string) =>
    setModelForm((f) => ({ ...f, [k]: v }))

  // مالک
  const [ownerForm, setOwnerForm] = useState(emptyOwnerForm)
  const setOf = (k: keyof typeof emptyOwnerForm, v: string) =>
    setOwnerForm((f) => ({ ...f, [k]: v }))
  const [selectedOwner, setSelectedOwner] = useState<ApiUser | null>(null)
  const [ownerSearching, setOwnerSearching] = useState(false)
  const [ownerSearched, setOwnerSearched] = useState(false)
  const [ownerNotFound, setOwnerNotFound] = useState(false)
  const [isNewOwner, setIsNewOwner] = useState(false)

  // اطلاعات اضافه خودرو
  const [carYear, setCarYear] = useState("")
  const [carMileage, setCarMileage] = useState("")

  // دوربین
  const [camActive, setCamActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ocrError, setOcrError] = useState("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // ── مرحله ۲: سرویس‌ها و قطعات ──────────────────────────────
  const [allServices, setAllServices] = useState<Service[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [serviceOrders, setServiceOrders] = useState<LocalServiceOrder[]>([])
  const [productOrders, setProductOrders] = useState<LocalProductOrder[]>([])
  const [visitDescription, setVisitDescription] = useState("")

  // جستجوی سرویس و محصول
  const [serviceSearch, setServiceSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")

  // وضعیت submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // ── محاسبات ──────────────────────────────────────────────────
  const plateQuery = `${plate.twoDigits}${plate.letter}${plate.threeDigits}${plate.region}`
  const filteredCars = allCars.filter((c) =>
    c.plate_number?.includes(plateQuery) ||
    c.model?.make?.includes(plate.twoDigits) ||
    c.model?.model?.includes(plate.twoDigits)
  )
  const filteredModels = allModels.filter(
    (m) =>
      !modelSearch ||
      m.make?.includes(modelSearch) ||
      m.model?.includes(modelSearch) ||
      String(m.model_year ?? "").includes(modelSearch)
  )
  const filteredServices = allServices.filter(
    (s) => !serviceSearch || s.title?.includes(serviceSearch)
  )
  const filteredProducts = allProducts.filter(
    (p) => !productSearch || p.name?.includes(productSearch)
  )
  const plateValid =
    plate.twoDigits.length === 2 &&
    plate.letter &&
    plate.threeDigits.length === 3 &&
    plate.region.length >= 2

  // ── بارگذاری داده‌ها ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setCarsLoading(true)
    fetchCars().then(setAllCars).finally(() => setCarsLoading(false))
  }, [open])

  useEffect(() => {
    if (step !== "orders") return
    Promise.all([fetchServices(), fetchProducts()]).then(([s, p]) => {
      setAllServices(s)
      setAllProducts(p)
    })
    if (allModels.length === 0) {
      setModelsLoading(true)
      fetchModels().then(setAllModels).finally(() => setModelsLoading(false))
    }
  }, [step])

  // ── دوربین ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamActive(false)
  }, [])

  const startCamera = async () => {
    setOcrError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamActive(true)
    } catch {
      setOcrError("دسترسی به دوربین مجاز نیست.")
    }
  }

  const scanPlate = async () => {
    if (!videoRef.current) return
    setScanning(true)
    setOcrError("")
    try {
      const frame = captureFrame(videoRef.current)
      setCapturedImage(frame)
      const result = await ocrLicensePlate(videoRef.current)
      if (result?.success && result.plate) {
        setPl("twoDigits", result.plate.twoDigits)
        setPl("letter", result.plate.letter)
        setPl("threeDigits", result.plate.threeDigits)
        setPl("region", result.plate.region)
        stopCamera()
      } else {
        setOcrError(result?.message ?? "پلاک شناسایی نشد. دوباره تلاش کنید.")
      }
    } catch {
      setOcrError("خطا در اسکن پلاک.")
    } finally {
      setScanning(false)
    }
  }

  // ── جستجوی مالک ──────────────────────────────────────────────
  const handleSearchOwner = async () => {
    if (!ownerForm.phone.trim()) return
    setOwnerSearching(true)
    setOwnerNotFound(false)
    setSelectedOwner(null)
    setIsNewOwner(false)
    setOwnerSearched(false)
    try {
      const found = await fetchUserByPhone(ownerForm.phone.trim())
      setOwnerSearched(true)
      if (found) {
        setSelectedOwner(found)
        setIsNewOwner(false)
        setOwnerNotFound(false)
        setOwnerForm((f) => ({
          ...f,
          firstName: found.profile?.first_name ?? "",
          lastName: found.profile?.last_name ?? "",
          email: found.profile?.email ?? "",
        }))
      } else {
        setOwnerNotFound(true)
      }
    } finally {
      setOwnerSearching(false)
    }
  }

  // ── انتخاب ماشین از dropdown ─────────────────────────────────
  const handleSelectCar = useCallback((car: ApiCar) => {
    setSelectedCar(car)
    setPlateDropOpen(false)
    setPlate({
      twoDigits: String(car.plate_first ?? ""),
      letter: car.plate_letter ?? "ب",
      threeDigits: String(car.plate_second ?? ""),
      region: String(car.plate_region ?? ""),
    })
    setCarYear(String(car.manufacturing_year ?? ""))
    setCarMileage(String(car.last_mileage ?? ""))
    setSelectedOwner(car.owner ? { ...car.owner } : null)
    setOwnerForm({
      phone: car.owner?.phone ?? "",
      firstName: car.owner?.profile?.first_name ?? "",
      lastName: car.owner?.profile?.last_name ?? "",
      email: car.owner?.profile?.email ?? "",
    })
    setOwnerSearched(!!car.owner)
    setOwnerNotFound(false)
    setIsNewOwner(false)
    if (car.model) {
      setSelectedModel(car.model)
      setModelSearch(`${car.model.make ?? ""} ${car.model.model} ${car.model.model_year ?? ""}`)
    }
  }, [])

  // ── مدیریت سرویس‌ها ──────────────────────────────────────────
  const addServiceOrder = () => {
    setServiceOrders((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        existingService: null,
        isNewService: false,
        newServiceTitle: "",
        newServiceDescription: "",
        newServiceBasePrice: "",
        title: "",
        extraDescription: "",
        price: "",
        status: "pending",
      },
    ])
  }

  const removeServiceOrder = (key: string) =>
    setServiceOrders((prev) => prev.filter((o) => o._key !== key))

  const updateServiceOrder = (key: string, patch: Partial<LocalServiceOrder>) =>
    setServiceOrders((prev) => prev.map((o) => (o._key === key ? { ...o, ...patch } : o)))

  // ── مدیریت قطعات ─────────────────────────────────────────────
  const addProductOrder = () => {
    setProductOrders((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        existingProduct: null,
        isNewProduct: false,
        newProductName: "",
        newProductPrice: "",
        newProductStock: "",
        newProductDescription: "",
        newProductTypeName: "",
        quantity: "1",
      },
    ])
  }

  const removeProductOrder = (key: string) =>
    setProductOrders((prev) => prev.filter((o) => o._key !== key))

  const updateProductOrder = (key: string, patch: Partial<LocalProductOrder>) =>
    setProductOrders((prev) => prev.map((o) => (o._key === key ? { ...o, ...patch } : o)))

  // ── reset ──────────────────────────────────────────────────────
  const reset = () => {
    setStep("car")
    setPlate(emptyPlate)
    setSelectedCar(null)
    setSelectedModel(null)
    setIsNewModel(false)
    setModelSearch("")
    setModelForm(emptyModelForm)
    setModelDropOpen(false)
    setPlateDropOpen(false)
    setOwnerForm(emptyOwnerForm)
    setSelectedOwner(null)
    setOwnerSearched(false)
    setOwnerNotFound(false)
    setIsNewOwner(false)
    setCarYear("")
    setCarMileage("")
    setServiceOrders([])
    setProductOrders([])
    setVisitDescription("")
    setSubmitError("")
    setOcrError("")
    setCapturedImage(null)
    stopCamera()
  }

  // ── ارسال نهایی ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      const carPayload = buildCarPayload(
        selectedCar,
        plate,
        ownerForm.phone,
        selectedModel,
        isNewModel,
        modelForm,
        carYear,
        carMileage,
      )

      const payload: MegaVisitPayload = {
        car: carPayload,
        service_orders: buildServiceOrders(serviceOrders),
        product_orders: buildProductOrders(productOrders),
        status: "queued",
        description: visitDescription || undefined,
      }

      await createVisitMega(payload)

      // ثبت در state داخلی گاراژ (cast به unknown برای سازگاری با local Car type)
      const ownerFullName = [ownerForm.firstName, ownerForm.lastName].filter(Boolean).join(" ")
      if (selectedCar) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addCar({
          plate: {
            twoDigits: String(selectedCar.plate_first),
            letter: selectedCar.plate_letter,
            threeDigits: String(selectedCar.plate_second),
            region: String(selectedCar.plate_region),
          },
          brand: selectedCar.model?.make ?? "",
          model: selectedCar.model?.model ?? "",
          color: "",
          year: String(selectedCar.manufacturing_year ?? ""),
          ownerName: ownerFullName || (selectedCar.owner?.phone ?? ""),
          ownerPhone: selectedCar.owner?.phone ?? "",
          ownerEmail: selectedCar.owner?.profile?.email,
          note: visitDescription,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addCar({
          plate: {
            twoDigits: plate.twoDigits,
            letter: plate.letter,
            threeDigits: plate.threeDigits,
            region: plate.region,
          },
          brand: selectedModel?.make ?? modelForm.make,
          model: selectedModel?.model ?? modelForm.model,
          color: "",
          year: carYear,
          ownerName: ownerFullName || ownerForm.phone,
          ownerPhone: ownerForm.phone,
          ownerEmail: ownerForm.email || undefined,
          note: visitDescription,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
      }

      onSuccess?.()
      reset()
      setOpen(false)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "خطایی رخ داد. دوباره تلاش کنید.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── رندر ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={<Button size="lg" className="gap-2 font-semibold" />}>
        <Plus className="size-5" />
        ثبت خودروی جدید
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto font-sans" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {step === "car" ? "ثبت خودرو در گاراژ" : "سرویس‌ها و قطعات"}
          </DialogTitle>
          <DialogDescription>
            {step === "car"
              ? "پلاک را وارد کنید، خودرو و مالک را مشخص کنید."
              : "سرویس‌ها و قطعات مورد نیاز را اضافه کنید."}
          </DialogDescription>
        </DialogHeader>

        {/* ─── نوار مراحل ─────────────────────────────── */}
        <div className="flex items-center gap-3 py-1">
          {(["car", "orders"] as Step[]).map((s, i) => {
            const labels = ["خودرو و مالک", "سرویس‌ها و قطعات"]
            const active = step === s
            const done = (step === "orders" && s === "car")
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-border" />}
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground" :
                  done ? "bg-primary/20 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {done && <Check className="size-3" />}
                  {!done && <span>{i + 1}</span>}
                  {labels[i]}
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="space-y-5 py-1">

          {/* ═══════════════════════════════════════════
              مرحله ۱: خودرو و مالک
          ══════════════════════════════════════════════ */}
          {step === "car" && (
            <div className="space-y-5">

              {/* ── پلاک ── */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">پلاک خودرو</Label>

                {/* ورودی پلاک */}
                <div className="grid grid-cols-[2fr_1.5fr_3fr_2fr] gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">۲ رقم</Label>
                    <Input
                      inputMode="numeric" maxLength={2}
                      value={plate.twoDigits}
                      onChange={(e) => { setPl("twoDigits", e.target.value.replace(/\D/g, "")); setSelectedCar(null) }}
                      placeholder="۱۱"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">حرف</Label>
                    <Select value={plate.letter} onValueChange={(v) => { setPl("letter", v ?? "ب"); setSelectedCar(null) }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATE_LETTERS.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">۳ رقم</Label>
                    <Input
                      inputMode="numeric" maxLength={3}
                      value={plate.threeDigits}
                      onChange={(e) => { setPl("threeDigits", e.target.value.replace(/\D/g, "")); setSelectedCar(null) }}
                      placeholder="۴۵۳"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ایران</Label>
                    <Input
                      inputMode="numeric" maxLength={2}
                      value={plate.region}
                      onChange={(e) => { setPl("region", e.target.value.replace(/\D/g, "")); setSelectedCar(null) }}
                      placeholder="۱۱"
                    />
                  </div>
                </div>

                {/* پیش‌نمایش پلاک */}
                {plateValid && (
                  <LicensePlate plate={plate} className="mx-auto" />
                )}

                {/* دوربین */}
                <div className="flex gap-2">
                  {!camActive ? (
                    <Button type="button" variant="outline" size="sm" onClick={startCamera} className="gap-1.5">
                      <Camera className="size-4" /> اسکن با دوربین
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={stopCamera} className="gap-1.5">
                      <CameraOff className="size-4" /> بستن دوربین
                    </Button>
                  )}
                </div>
                {camActive && (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                    <Button
                      type="button" size="sm"
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 gap-1.5"
                      onClick={scanPlate} disabled={scanning}
                    >
                      {scanning ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      تشخیص پلاک
                    </Button>
                  </div>
                )}
                {capturedImage && !camActive && (
                  <img src={capturedImage} alt="تصویر گرفته شده" className="w-full rounded-xl border border-border" />
                )}
                {ocrError && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4" />{ocrError}
                  </p>
                )}

                {/* dropdown جستجوی ماشین */}
                {(plate.twoDigits || plate.threeDigits) && (
                  <div className="rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <Search className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {carsLoading ? "در حال بارگذاری..." : `${filteredCars.length} خودرو`}
                      </span>
                      <button onClick={() => setPlateDropOpen(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                    {carsLoading ? (
                      <div className="flex justify-center py-5">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ul className="max-h-40 overflow-y-auto divide-y divide-border">
                        {filteredCars.map((car) => (
                          <li key={car.id}>
                            <button
                              onClick={() => handleSelectCar(car)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-right text-sm transition-colors hover:bg-accent"
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-sm">
                                  {car.model ? `${car.model.make ?? ""} ${car.model.model}` : "مدل نامشخص"}
                                  {car.model?.model_year && <span className="mr-2 text-xs text-muted-foreground">{toFa(String(car.model.model_year))}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {car.plate_number} · {car.owner?.phone ?? "مالک نامشخص"}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {car.in_garage ? "در گاراژ" : "خارج"}
                              </Badge>
                            </button>
                          </li>
                        ))}
                        {filteredCars.length === 0 && (
                          <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                            ماشینی پیدا نشد — خودروی جدید ثبت می‌شود
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {/* ماشین انتخاب‌شده */}
                {selectedCar && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                    <div>
                      <span className="font-semibold">
                        {selectedCar.model ? `${selectedCar.model.make ?? ""} ${selectedCar.model.model}` : "مدل نامشخص"}
                      </span>
                      <span className="mr-2 text-muted-foreground">{selectedCar.owner?.phone ?? ""}</span>
                    </div>
                    <button onClick={() => { setSelectedCar(null); setSelectedOwner(null); setOwnerSearched(false) }} className="text-muted-foreground hover:text-destructive">
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── مالک (فقط وقتی ماشین جدیده) ── */}
              {!selectedCar && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">مالک خودرو</Label>
                    <div className="flex gap-2">
                      <Input
                        inputMode="numeric"
                        value={ownerForm.phone}
                        onChange={(e) => {
                          setOf("phone", e.target.value.replace(/\D/g, ""))
                          setSelectedOwner(null)
                          setOwnerSearched(false)
                          setOwnerNotFound(false)
                          setIsNewOwner(false)
                        }}
                        placeholder="شماره تماس مالک — ۰۹۱۲..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearchOwner()
                        }}
                      />
                      <Button
                        type="button" variant="secondary"
                        onClick={handleSearchOwner}
                        disabled={ownerSearching || !ownerForm.phone.trim()}
                      >
                        {ownerSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      </Button>
                    </div>

                    {/* یوزر پیدا شد */}
                    {selectedOwner && !ownerNotFound && (
                      <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary">مالک پیدا شد</span>
                          <button onClick={() => { setSelectedOwner(null); setOwnerSearched(false) }} className="text-muted-foreground hover:text-destructive">
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {selectedOwner.profile?.first_name && (
                            <div><span className="text-muted-foreground">نام: </span>{selectedOwner.profile.first_name} {selectedOwner.profile.last_name}</div>
                          )}
                          <div><span className="text-muted-foreground">تلفن: </span>{toFa(selectedOwner.phone)}</div>
                          {selectedOwner.profile?.email && (
                            <div className="col-span-2"><span className="text-muted-foreground">ایمیل: </span>{selectedOwner.profile.email}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* یوزر پیدا نشد */}
                    {ownerSearched && ownerNotFound && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2">
                          کاربری با این شماره یافت نشد. می‌توانید مالک جدید ثبت کنید.
                        </p>
                        <Button
                          type="button" variant={isNewOwner ? "default" : "outline"} size="sm"
                          onClick={() => setIsNewOwner((v) => !v)}
                          className="gap-1.5"
                        >
                          <Plus className="size-4" />
                          {isNewOwner ? "انصراف از ثبت مالک جدید" : "ثبت مالک جدید"}
                        </Button>
                        {isNewOwner && (
                          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>نام</Label>
                              <Input value={ownerForm.firstName} onChange={(e) => setOf("firstName", e.target.value)} placeholder="علی" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>نام خانوادگی</Label>
                              <Input value={ownerForm.lastName} onChange={(e) => setOf("lastName", e.target.value)} placeholder="محمدی" />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                              <Label>ایمیل</Label>
                              <Input type="email" value={ownerForm.email} onChange={(e) => setOf("email", e.target.value)} placeholder="ali@gmail.com" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── مدل (فقط ماشین جدید) ── */}
              {!selectedCar && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">مدل خودرو</Label>
                    <div className="relative">
                      <Input
                        value={modelSearch}
                        onChange={(e) => {
                          setModelSearch(e.target.value)
                          setSelectedModel(null)
                          setIsNewModel(false)
                          setModelDropOpen(true)
                        }}
                        onFocus={() => setModelDropOpen(true)}
                        placeholder="جستجو: ایران خودرو، پژو ۴۰۵..."
                      />
                      <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    {modelDropOpen && (
                      <div className="rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                          <Search className="size-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {modelsLoading ? "در حال بارگذاری..." : `${filteredModels.length} مدل`}
                          </span>
                          <button onClick={() => setModelDropOpen(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                            <X className="size-4" />
                          </button>
                        </div>
                        {modelsLoading ? (
                          <div className="flex justify-center py-5">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <ul className="max-h-44 overflow-y-auto divide-y divide-border">
                            {filteredModels.map((m) => (
                              <li key={m.id}>
                                <button
                                  onClick={() => { setSelectedModel(m); setIsNewModel(false); setModelSearch(`${m.make ?? ""} ${m.model} ${m.model_year ?? ""}`); setModelDropOpen(false) }}
                                  className="w-full px-4 py-2.5 text-right text-sm transition-colors hover:bg-accent"
                                >
                                  <span className="font-medium">{m.make} {m.model}</span>
                                  <span className="mr-2 text-xs text-muted-foreground">
                                    {m.model_year} · {m.transmission_type === "man" ? "دنده‌ای" : "اتوماتیک"}
                                  </span>
                                </button>
                              </li>
                            ))}
                            <li>
                              <button
                                onClick={() => { setIsNewModel(true); setSelectedModel(null); setModelDropOpen(false) }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-primary hover:bg-accent"
                              >
                                <Plus className="size-4" />
                                ثبت مدل جدید: «{modelSearch || "..."}»
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                    )}
                    {selectedModel && !isNewModel && (
                      <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                        <span>{selectedModel.make} {selectedModel.model} — {selectedModel.model_year}</span>
                        <button onClick={() => { setSelectedModel(null); setModelSearch("") }} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                    {isNewModel && (
                      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>سازنده *</Label>
                          <Input value={modelForm.make} onChange={(e) => setMf("make", e.target.value)} placeholder="ایران خودرو" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>مدل *</Label>
                          <Input value={modelForm.model} onChange={(e) => setMf("model", e.target.value)} placeholder="پژو ۴۰۵" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>سال مدل</Label>
                          <Input inputMode="numeric" value={modelForm.model_year} onChange={(e) => setMf("model_year", e.target.value.replace(/\D/g, ""))} placeholder="۱۳۹۵" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>گیربکس</Label>
                          <Select value={modelForm.transmission_type} onValueChange={(v) => setMf("transmission_type", v ?? "man")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="man">دنده‌ای</SelectItem>
                              <SelectItem value="auto">اتوماتیک</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── اطلاعات تکمیلی (برای ماشین جدید) ── */}
              {!selectedCar && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>سال ساخت</Label>
                      <Input inputMode="numeric" value={carYear} onChange={(e) => setCarYear(e.target.value.replace(/\D/g, ""))} placeholder="۱۴۰۰" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>کارکرد (کیلومتر)</Label>
                      <Input inputMode="numeric" value={carMileage} onChange={(e) => setCarMileage(e.target.value.replace(/\D/g, ""))} placeholder="۵۰۰۰۰" />
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* ═══════════════════════════════════════════
              مرحله ۲: سرویس‌ها و قطعات
          ══════════════════════════════════════════════ */}
          {step === "orders" && (
            <div className="space-y-6">

              {/* توضیحات کلی */}
              <div className="space-y-1.5">
                <Label>توضیحات کلی ویزیت</Label>
                <Input value={visitDescription} onChange={(e) => setVisitDescription(e.target.value)} placeholder="مثلاً: صدای غیرعادی از موتور" />
              </div>

              <Separator />

              {/* ── سرویس‌ها ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">سرویس‌ها</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addServiceOrder} className="gap-1.5">
                    <Plus className="size-4" /> افزودن سرویس
                  </Button>
                </div>

                {serviceOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                    هیچ سرویسی اضافه نشده
                  </p>
                )}

                {serviceOrders.map((order) => (
                  <div key={order._key} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">سرویس</span>
                      <button onClick={() => removeServiceOrder(order._key)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {/* انتخاب سرویس موجود یا جدید */}
                    {!order.existingService && !order.isNewService ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            value={serviceSearch}
                            onChange={(e) => setServiceSearch(e.target.value)}
                            placeholder="جستجوی سرویس..."
                          />
                        </div>
                        <div className="rounded-lg border border-border max-h-36 overflow-y-auto divide-y divide-border">
                          {filteredServices.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => updateServiceOrder(order._key, {
                                existingService: s,
                                title: s.title,
                                price: String(s.base_price ?? ""),
                              })}
                              className="w-full px-3 py-2 text-right text-sm hover:bg-accent"
                            >
                              <span className="font-medium">{s.title}</span>
                              {s.base_price && <span className="mr-2 text-xs text-muted-foreground">{toFa(String(s.base_price))} تومان</span>}
                            </button>
                          ))}
                          <button
                            onClick={() => updateServiceOrder(order._key, { isNewService: true })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent"
                          >
                            <Plus className="size-4" /> ثبت سرویس جدید
                          </button>
                        </div>
                      </div>
                    ) : order.isNewService ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <Label>عنوان سرویس *</Label>
                          <Input value={order.newServiceTitle} onChange={(e) => updateServiceOrder(order._key, { newServiceTitle: e.target.value })} placeholder="مثلاً: تعویض روغن" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label>توضیحات</Label>
                          <Input value={order.newServiceDescription} onChange={(e) => updateServiceOrder(order._key, { newServiceDescription: e.target.value })} placeholder="توضیحات اختیاری" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>قیمت پایه</Label>
                          <Input inputMode="numeric" value={order.newServiceBasePrice} onChange={(e) => updateServiceOrder(order._key, { newServiceBasePrice: e.target.value.replace(/\D/g, ""), price: e.target.value.replace(/\D/g, "") })} placeholder="تومان" />
                        </div>
                        <div className="flex items-end">
                          <button onClick={() => updateServiceOrder(order._key, { isNewService: false })} className="text-xs text-muted-foreground hover:text-foreground underline">
                            بازگشت به جستجو
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="font-medium">{order.existingService?.title}</span>
                        <button onClick={() => updateServiceOrder(order._key, { existingService: null, isNewService: false })} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}

                    {/* فیلدهای مشترک order */}
                    {(order.existingService || order.isNewService) && (
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                        <div className="space-y-1.5">
                          <Label>قیمت نهایی</Label>
                          <Input inputMode="numeric" value={order.price} onChange={(e) => updateServiceOrder(order._key, { price: e.target.value.replace(/\D/g, "") })} placeholder="تومان" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>وضعیت</Label>
                          <Select value={order.status} onValueChange={(v) => updateServiceOrder(order._key, { status: (v ?? "pending") as ServiceOrderStatus })}>
                            <SelectTrigger><SelectValue>{order.status === "pending" ? "در انتظار" : order.status === "in-progress" ? "در حال انجام" : "انجام شد"}</SelectValue></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">در انتظار</SelectItem>
                              <SelectItem value="in-progress">در حال انجام</SelectItem>
                              <SelectItem value="done">انجام شد</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label>توضیحات اضافی</Label>
                          <Input value={order.extraDescription} onChange={(e) => updateServiceOrder(order._key, { extraDescription: e.target.value })} placeholder="اختیاری" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* ── قطعات ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">قطعات / کالا</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addProductOrder} className="gap-1.5">
                    <Plus className="size-4" /> افزودن قطعه
                  </Button>
                </div>

                {productOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                    هیچ قطعه‌ای اضافه نشده
                  </p>
                )}

                {productOrders.map((order) => (
                  <div key={order._key} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">قطعه</span>
                      <button onClick={() => removeProductOrder(order._key)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {!order.existingProduct && !order.isNewProduct ? (
                      <div className="space-y-2">
                        <Input
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="جستجوی قطعه..."
                        />
                        <div className="rounded-lg border border-border max-h-36 overflow-y-auto divide-y divide-border">
                          {filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => updateProductOrder(order._key, { existingProduct: p })}
                              className="w-full px-3 py-2 text-right text-sm hover:bg-accent"
                            >
                              <span className="font-medium">{p.name}</span>
                              {p.price && <span className="mr-2 text-xs text-muted-foreground">{toFa(String(p.price))} تومان</span>}
                              {p.stock !== undefined && <span className="mr-2 text-xs text-muted-foreground">موجودی: {toFa(String(p.stock))}</span>}
                            </button>
                          ))}
                          <button
                            onClick={() => updateProductOrder(order._key, { isNewProduct: true })}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent"
                          >
                            <Plus className="size-4" /> ثبت قطعه جدید
                          </button>
                        </div>
                      </div>
                    ) : order.isNewProduct ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 col-span-2">
                          <Label>نام قطعه *</Label>
                          <Input value={order.newProductName} onChange={(e) => updateProductOrder(order._key, { newProductName: e.target.value })} placeholder="مثلاً: فیلتر هوا" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>قیمت (تومان)</Label>
                          <Input inputMode="numeric" value={order.newProductPrice} onChange={(e) => updateProductOrder(order._key, { newProductPrice: e.target.value.replace(/\D/g, "") })} placeholder="۰" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>موجودی انبار</Label>
                          <Input inputMode="numeric" value={order.newProductStock} onChange={(e) => updateProductOrder(order._key, { newProductStock: e.target.value.replace(/\D/g, "") })} placeholder="۰" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label>نوع قطعه</Label>
                          <Input value={order.newProductTypeName} onChange={(e) => updateProductOrder(order._key, { newProductTypeName: e.target.value })} placeholder="مثلاً: فیلتر" />
                        </div>
                        <div className="flex items-end">
                          <button onClick={() => updateProductOrder(order._key, { isNewProduct: false })} className="text-xs text-muted-foreground hover:text-foreground underline">
                            بازگشت به جستجو
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="font-medium">{order.existingProduct?.name}</span>
                        <button onClick={() => updateProductOrder(order._key, { existingProduct: null, isNewProduct: false })} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}

                    {(order.existingProduct || order.isNewProduct) && (
                      <div className="border-t border-border pt-2">
                        <div className="space-y-1.5 w-32">
                          <Label>تعداد</Label>
                          <Input inputMode="numeric" value={order.quantity} onChange={(e) => updateProductOrder(order._key, { quantity: e.target.value.replace(/\D/g, "") })} placeholder="۱" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {submitError && (
                <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {submitError}
                </p>
              )}
            </div>
          )}

        </div>

        {/* ─── footer ──────────────────────────────────── */}
        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => step === "car" ? setOpen(false) : setStep("car")}
          >
            {step === "car" ? "انصراف" : "مرحله قبل"}
          </Button>

          {step === "car" && (
            <Button
              onClick={() => setStep("orders")}
              disabled={!plateValid}
              className="gap-2 font-semibold"
            >
              ادامه — سرویس‌ها
            </Button>
          )}

          {step === "orders" && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 font-semibold"
            >
              {submitting
                ? <><Loader2 className="size-4 animate-spin" /> در حال ثبت...</>
                : <><Check className="size-4" /> ثبت ویزیت</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
