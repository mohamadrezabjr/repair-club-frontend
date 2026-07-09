"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  Edit2,
  Loader2,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PLATE_LETTERS, type ApiCar, type ApiCarModel, type ApiUser } from "@/lib/types"
import { toFa } from "@/lib/format"
import { LicensePlate } from "@/components/license-plate"
import {
  fetchCars,
  fetchModels,
  createVisitWithCar,
  searchUsersByPhone,
  updateCar,
  updateModel,
  type CreateVisitWithCarPayload,
} from "@/lib/api"
import { ocrLicensePlate, captureFrame } from "@/lib/ocr"
import { toast } from "sonner"

// ─────────────────── حالت‌های اولیه ───────────────────

const emptyForm = {
  twoDigits: "",
  letter: "ب",
  threeDigits: "",
  region: "",
  year: "",
  mileage: "",
  note: "",
}

const emptyModel = {
  make: "",
  model: "",
  model_year: "",
  transmission_type: "man" as "man" | "auto",
}

const emptyOwner = {
  phone: "",
  first_name: "",
  last_name: "",
  email: "",
}

type Step = "plate" | "info"

// ─────────────────── کامپوننت ───────────────────

export function AddCarDialog({ onSuccessAction }: { onSuccessAction?: () => void } = {}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("plate")

  // ── فرم پلاک / اطلاعات ماشین ──
  const [form, setForm] = useState(emptyForm)
  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  // ── دوربین ──
  const [camActive, setCamActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ocrError, setOcrError] = useState("")

  // ── جستجوی پلاک در لیست خودروها ──
  const [allCars, setAllCars] = useState<ApiCar[]>([])
  const [carsLoading, setCarsLoading] = useState(false)
  const [plateDropOpen, setPlateDropOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState<ApiCar | null>(null)

  // ── مدل خودرو ──
  const [allModels, setAllModels] = useState<ApiCarModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const [modelDropOpen, setModelDropOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ApiCarModel | null>(null)
  const [isNewModel, setIsNewModel] = useState(false)
  const [newModelForm, setNewModelForm] = useState(emptyModel)
  const setNm = (key: keyof typeof emptyModel, value: string) =>
    setNewModelForm((f) => ({ ...f, [key]: value }))

  // ── بخش مالک ──
  const [ownerForm, setOwnerForm] = useState(emptyOwner)
  const setOwn = (key: keyof typeof emptyOwner, value: string) =>
    setOwnerForm((f) => ({ ...f, [key]: value }))
  const [selectedOwner, setSelectedOwner] = useState<ApiUser | null>(null)
  const [ownerSearchResults, setOwnerSearchResults] = useState<ApiUser[]>([])
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false)
  const [ownerDropOpen, setOwnerDropOpen] = useState(false)
  const [showNewOwnerForm, setShowNewOwnerForm] = useState(false)
  const ownerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── حالت ویرایش ماشین / مدل موجود ──
  const [editingCar, setEditingCar] = useState(false)
  const [editCarForm, setEditCarForm] = useState({ year: "", mileage: "" })
  const [editingCarLoading, setEditingCarLoading] = useState(false)

  const [editingModel, setEditingModel] = useState(false)
  const [editModelForm, setEditModelForm] = useState({
    make: "",
    model: "",
    model_year: "",
    transmission_type: "man" as "man" | "auto",
  })
  const [editingModelLoading, setEditingModelLoading] = useState(false)

  // ── توضیحات ویزیت ──
  const [visitDescription, setVisitDescription] = useState("")

  // ── وضعیت submit ──
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // ── بارگذاری خودروها هنگام باز شدن ──
  useEffect(() => {
    if (!open) return
    setCarsLoading(true)
    fetchCars()
      .then(setAllCars)
      .catch(() => {})
      .finally(() => setCarsLoading(false))
  }, [open])

  // ── بارگذاری مدل‌ها هنگام رفتن به مرحله دوم ──
  useEffect(() => {
    if (step !== "info") return
    setModelsLoading(true)
    fetchModels()
      .then(setAllModels)
      .catch(() => {})
      .finally(() => setModelsLoading(false))
  }, [step])

  // ─────────────────── فیلتر پلاک ───────────────────

  const plateQuery = `${form.twoDigits}${form.letter !== "ب" ? form.letter : ""}${form.threeDigits}${form.region}`
    .replace(/\s/g, "")
    .toLowerCase()

  const filteredCars =
    plateQuery.length < 1
      ? []
      : allCars.filter((c) => {
          const combined = `${c.plate_first}${c.plate_letter}${c.plate_second}${c.plate_region}`.toLowerCase()
          return combined.includes(plateQuery)
        })

  // ─────────────────── فیلتر مدل ───────────────────

  const filteredModels =
    modelSearch.length < 1
      ? allModels.slice(0, 8)
      : allModels.filter(
          (m) =>
            (m.make ?? "").includes(modelSearch) ||
            m.model.includes(modelSearch) ||
            String(m.model_year ?? "").includes(modelSearch),
        )

  // ─────────────────── جستجوی مالک با debounce ───────────────────

  const handleOwnerPhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    setOwn("phone", cleaned)
    setSelectedOwner(null)
    setShowNewOwnerForm(false)

    if (ownerDebounceRef.current) clearTimeout(ownerDebounceRef.current)

    if (cleaned.length >= 3) {
      ownerDebounceRef.current = setTimeout(async () => {
        setOwnerSearchLoading(true)
        setOwnerDropOpen(true)
        try {
          const results = await searchUsersByPhone(cleaned)
          setOwnerSearchResults(results)
        } catch {
          setOwnerSearchResults([])
        } finally {
          setOwnerSearchLoading(false)
        }
      }, 300)
    } else {
      setOwnerSearchResults([])
      setOwnerDropOpen(false)
    }
  }

  const handleSelectOwner = (user: ApiUser) => {
    setSelectedOwner(user)
    setOwnerForm({
      phone: user.phone,
      first_name: user.profile?.first_name ?? "",
      last_name: user.profile?.last_name ?? "",
      email: user.profile?.email ?? "",
    })
    setOwnerDropOpen(false)
    setShowNewOwnerForm(false)
  }

  const handleNewOwner = () => {
    setSelectedOwner(null)
    setShowNewOwnerForm(true)
    setOwnerDropOpen(false)
  }

  // ─────────────────── انتخاب ماشین از dropdown ───────────────────

  const handleSelectCar = useCallback((car: ApiCar) => {
    setSelectedCar(car)
    setPlateDropOpen(false)
    setEditingCar(false)
    setEditingModel(false)
    setForm({
      twoDigits: String(car.plate_first),
      letter: car.plate_letter,
      threeDigits: String(car.plate_second),
      region: String(car.plate_region),
      year: String(car.manufacturing_year ?? ""),
      mileage: String(car.last_mileage ?? ""),
      note: "",
    })
    setSelectedModel(car.model ?? null)
    if (car.model) {
      setModelSearch(
        `${car.model.make ?? ""} ${car.model.model} ${car.model.model_year ?? ""}`.trim(),
      )
    } else {
      setModelSearch("")
    }
    // پر کردن اطلاعات مالک از ماشین موجود
    if (car.owner) {
      setSelectedOwner(car.owner)
      setOwnerForm({
        phone: car.owner.phone,
        first_name: car.owner.profile?.first_name ?? "",
        last_name: car.owner.profile?.last_name ?? "",
        email: car.owner.profile?.email ?? "",
      })
    }
  }, [])

  // ─────────────────── انتخاب مدل از dropdown ───────────────────

  const handleSelectModel = useCallback((model: ApiCarModel) => {
    setSelectedModel(model)
    setIsNewModel(false)
    setModelDropOpen(false)
    setModelSearch(`${model.make ?? ""} ${model.model} ${model.model_year ?? ""}`.trim())
  }, [])

  // ─────────────────── اعمال ویرایش خودرو ───────────────────

  const handleApplyCarEdit = async () => {
    if (!selectedCar) return
    setEditingCarLoading(true)
    try {
      const updated = await updateCar(selectedCar.id, {
        manufacturing_year: editCarForm.year ? Number(editCarForm.year) : undefined,
        last_mileage: editCarForm.mileage ? Number(editCarForm.mileage) : undefined,
      })
      setSelectedCar(updated)
      setForm((f) => ({
        ...f,
        year: String(updated.manufacturing_year ?? ""),
        mileage: String(updated.last_mileage ?? ""),
      }))
      setEditingCar(false)
      toast.success("اطلاعات خودرو بروزرسانی شد")
    } catch {
      toast.error("خطا در بروزرسانی اطلاعات خودرو")
    } finally {
      setEditingCarLoading(false)
    }
  }

  // ─────────────────── اعمال ویرایش مدل ───────────────────

  const handleApplyModelEdit = async () => {
    if (!selectedModel) return
    setEditingModelLoading(true)
    try {
      const updated = await updateModel(selectedModel.id, {
        make: editModelForm.make || undefined,
        model: editModelForm.model || undefined,
        model_year: editModelForm.model_year ? Number(editModelForm.model_year) : undefined,
        transmission_type: editModelForm.transmission_type,
      })
      setSelectedModel(updated)
      setModelSearch(`${updated.make ?? ""} ${updated.model} ${updated.model_year ?? ""}`.trim())
      setEditingModel(false)
      toast.success("اطلاعات مدل بروزرسانی شد")
    } catch {
      toast.error("خطا در بروزرسانی مدل")
    } finally {
      setEditingModelLoading(false)
    }
  }

  // ─────────────────── دوربین ───────────────────

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamActive(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      setCamActive(true)
    } catch {
      alert("دسترسی به دوربین امکان‌پذیر نیست. پلاک را دستی وارد کنید.")
    }
  }

  useEffect(() => {
    if (camActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camActive])

  const capturePlate = async () => {
    if (!videoRef.current) return
    setScanning(true)
    setOcrError("")
    try {
      captureFrame(videoRef.current)
      const result = await ocrLicensePlate(videoRef.current)
      if (result.success) {
        set("twoDigits", result.plate.twoDigits)
        set("letter", result.plate.letter)
        set("threeDigits", result.plate.threeDigits)
        set("region", result.plate.region)
        setOcrError("")
        toast.success("پلاک با موفقیت خوانده شد")
      } else {
        setOcrError(result.message || "مشکل در خواندن پلاک")
        toast.error(result.message || "مشکل در خواندن پلاک")
      }
      stopCamera()
    } catch {
      setOcrError("خطا در خواندن پلاک. لطفاً دوباره تلاش کنید")
      toast.error("خطا در خواندن پلاک. لطفاً دوباره تلاش کنید")
      stopCamera()
    } finally {
      setScanning(false)
    }
  }

  // ─────────────────── ریست ───────────────────

  const reset = () => {
    setForm(emptyForm)
    setSelectedCar(null)
    setSelectedModel(null)
    setIsNewModel(false)
    setModelSearch("")
    setNewModelForm(emptyModel)
    setOwnerForm(emptyOwner)
    setSelectedOwner(null)
    setOwnerSearchResults([])
    setOwnerDropOpen(false)
    setShowNewOwnerForm(false)
    setEditingCar(false)
    setEditingModel(false)
    setVisitDescription("")
    setPlateDropOpen(false)
    setModelDropOpen(false)
    setStep("plate")
    setSubmitError("")
    stopCamera()
  }

  // ─────────────────── اعتبارسنجی ───────────────────

  const plateValid =
    form.twoDigits.length >= 1 && form.threeDigits.length >= 1 && form.region.length >= 1

  const modelValid =
    selectedModel !== null ||
    (isNewModel &&
      newModelForm.make.trim() &&
      newModelForm.model.trim() &&
      !!newModelForm.model_year)

  // ─────────────────── ارسال نهایی ───────────────────

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      // ساخت آبجکت مالک (انتخاب‌شده یا جدید)
      const ownerPayload = selectedOwner
        ? {
            id: selectedOwner.id,
            phone: selectedOwner.phone,
            profile: selectedOwner.profile ?? {
              first_name: ownerForm.first_name || null,
              last_name: ownerForm.last_name || null,
              email: ownerForm.email || null,
            },
            role: selectedOwner.role,
          }
        : showNewOwnerForm || ownerForm.phone
        ? {
            id: undefined,
            phone: ownerForm.phone,
            profile: {
              first_name: ownerForm.first_name || null,
              last_name: ownerForm.last_name || null,
              email: ownerForm.email || null,
            },
            role: "user" as const,
          }
        : undefined

      const payload: CreateVisitWithCarPayload = selectedCar
        ? {
            car: { id: selectedCar.id },
            status: "queued",
            description: visitDescription || null,
          }
        : {
            car: {
              owner: ownerPayload as any,
              model: isNewModel || !selectedModel
                ? {
                    id: null,
                    make: newModelForm.make,
                    model: newModelForm.model,
                    model_year: newModelForm.model_year
                      ? Number(newModelForm.model_year)
                      : null,
                    transmission_type: newModelForm.transmission_type,
                  }
                : { id: selectedModel!.id },
              manufacturing_year: form.year ? Number(form.year) : null,
              in_garage: true,
              last_mileage: form.mileage ? Number(form.mileage) : null,
              plate_first: Number(form.twoDigits),
              plate_letter: form.letter,
              plate_second: Number(form.threeDigits),
              plate_region: Number(form.region),
            } as any,
            status: "queued",
            description: visitDescription || form.note || null,
          }

      await createVisitWithCar(payload)
      toast.success("خودرو با موفقیت به گاراژ اضافه شد")
      reset()
      setOpen(false)
      onSuccessAction?.()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "خطایی رخ داد"
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────── رندر ───────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={<Button size="lg" className="gap-2 font-semibold" />}>
        <Plus className="size-5" />
        ثبت خودروی جدید
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl">ثبت خودروی ورودی به گاراژ</DialogTitle>
          <DialogDescription>
            {step === "plate"
              ? "پلاک را با دوربین اسکن یا دستی وارد کنید، سپس از لیست انتخاب کنید یا خودروی جدید ثبت کنید."
              : "اطلاعات خودرو، مدل و مالک را تکمیل کنید."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">

          {/* ══════════════ مرحله ۱: پلاک ══════════════ */}
          {step === "plate" && (
            <>
              {/* دوربین */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">
                    ثبت پلاک با دوربین
                  </span>
                  {camActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={stopCamera}
                      className="gap-1.5 text-destructive"
                    >
                      <CameraOff className="size-4" /> خاموش کردن
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startCamera}
                      className="gap-1.5"
                    >
                      <Camera className="size-4" /> روشن کردن دوربین
                    </Button>
                  )}
                </div>
                {camActive && (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-lg bg-black">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={() => {
                          videoRef.current?.play().catch(() => {})
                        }}
                        className="aspect-video w-full object-cover"
                      />
                      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-lg border-2 border-dashed border-primary/80" />
                    </div>
                    <Button
                      onClick={capturePlate}
                      disabled={scanning}
                      className="w-full gap-2"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> در حال تشخیص...
                        </>
                      ) : (
                        <>
                          <Camera className="size-4" /> گرفتن عکس و تشخیص پلاک
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {ocrError && (
                  <p className="mt-2 text-xs text-destructive">{ocrError}</p>
                )}
              </div>

              {/* ورود دستی پلاک */}
              <div className="flex justify-center">
                <LicensePlate
                  plate={{
                    twoDigits: form.twoDigits,
                    letter: form.letter,
                    threeDigits: form.threeDigits,
                    region: form.region,
                  }}
                  size="lg"
                  editable
                  onPlateChange={(p) => {
                    set("twoDigits", p.twoDigits)
                    set("letter", p.letter)
                    set("threeDigits", p.threeDigits)
                    set("region", p.region)
                    setSelectedCar(null)
                    setPlateDropOpen(true)
                  }}
                />
              </div>

              {/* dropdown جستجوی پلاک */}
              {plateDropOpen && (
                <div className="rounded-xl border border-border bg-card shadow-lg">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {carsLoading
                        ? "در حال جستجو..."
                        : filteredCars.length > 0
                        ? `${filteredCars.length} خودرو یافت شد`
                        : "خودروی مطابق پیدا نشد"}
                    </span>
                    <button
                      onClick={() => setPlateDropOpen(false)}
                      className="mr-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {carsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredCars.length > 0 ? (
                    <ul className="max-h-52 divide-y divide-border overflow-y-auto">
                      {filteredCars.map((car) => (
                        <li key={car.id}>
                          <button
                            onClick={() => handleSelectCar(car)}
                            className="w-full px-4 py-3 text-right transition-colors hover:bg-accent"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">
                                  {car.model
                                    ? `${car.model.make} ${car.model.model}`
                                    : "مدل نامشخص"}
                                  {car.model && (
                                    <span className="mr-2 text-xs text-muted-foreground">
                                      {car.model.model_year}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {car.owner
                                    ? `مالک: ${car.owner.phone}`
                                    : "مالک نامشخص"}
                                  {(car.last_mileage ?? 0) > 0 &&
                                    ` · کارکرد: ${toFa(String(car.last_mileage))} کیلومتر`}
                                </div>
                              </div>
                              <div className="shrink-0">
                                <LicensePlate
                                  plate={{
                                    twoDigits: String(car.plate_first),
                                    letter: car.plate_letter,
                                    threeDigits: String(car.plate_second),
                                    region: String(car.plate_region),
                                  }}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : plateQuery.length > 0 ? (
                    <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                      خودرویی با این پلاک در سیستم ثبت نشده — می‌توانید خودروی جدید ثبت کنید.
                    </div>
                  ) : null}
                </div>
              )}

              {/* نمایش ماشین انتخاب‌شده */}
              {selectedCar && (
                <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {selectedCar.model
                        ? `${selectedCar.model.make} ${selectedCar.model.model} — ${selectedCar.model.model_year}`
                        : "مدل نامشخص"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {selectedCar.owner?.phone ?? "مالک نامشخص"} · کارکرد:{" "}
                      {toFa(String(selectedCar.last_mileage ?? 0))} کیلومتر
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LicensePlate
                      plate={{
                        twoDigits: String(selectedCar.plate_first),
                        letter: selectedCar.plate_letter,
                        threeDigits: String(selectedCar.plate_second),
                        region: String(selectedCar.plate_region),
                      }}
                      size="sm"
                    />
                    <button
                      onClick={() => { setSelectedCar(null); setForm(emptyForm) }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════ مرحله ۲: اطلاعات ══════════════ */}
          {step === "info" && (
            <>
              {selectedCar ? (
                /* ────────── ماشین موجود ────────── */
                <div className="space-y-4">

                  {/* ── مدل خودرو (موجود) ── */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">مدل خودرو</span>
                      {!editingModel ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditModelForm({
                              make: selectedModel?.make ?? "",
                              model: selectedModel?.model ?? "",
                              model_year: String(selectedModel?.model_year ?? ""),
                              transmission_type: (selectedModel?.transmission_type as "man" | "auto") ?? "man",
                            })
                            setEditingModel(true)
                          }}
                        >
                          <Edit2 className="size-3.5" /> ویرایش
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => setEditingModel(false)}
                          >
                            انصراف
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={editingModelLoading}
                            onClick={handleApplyModelEdit}
                          >
                            {editingModelLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            اعمال تغییرات
                          </Button>
                        </div>
                      )}
                    </div>

                    {!editingModel ? (
                      selectedModel ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">سازنده:</span>
                            <span className="font-medium">{selectedModel.make}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">مدل:</span>
                            <span className="font-medium">{selectedModel.model}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">سال:</span>
                            <span className="font-medium">{selectedModel.model_year}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">گیربکس:</span>
                            <span className="font-medium">
                              {selectedModel.transmission_type === "man" ? "دنده‌ای" : "اتوماتیک"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">مدل نامشخص</p>
                      )
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>س��زنده</Label>
                          <Input
                            value={editModelForm.make}
                            onChange={(e) =>
                              setEditModelForm((f) => ({ ...f, make: e.target.value }))
                            }
                            placeholder="ایران خودرو"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>مدل</Label>
                          <Input
                            value={editModelForm.model}
                            onChange={(e) =>
                              setEditModelForm((f) => ({ ...f, model: e.target.value }))
                            }
                            placeholder="پژو ۴۰۵"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>سال مدل</Label>
                          <Input
                            inputMode="numeric"
                            value={editModelForm.model_year}
                            onChange={(e) =>
                              setEditModelForm((f) => ({
                                ...f,
                                model_year: e.target.value.replace(/\D/g, ""),
                              }))
                            }
                            placeholder="۱۳۹۵"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>گیربکس</Label>
                          <Select
                            value={editModelForm.transmission_type}
                            onValueChange={(v) =>
                              setEditModelForm((f) => ({
                                ...f,
                                transmission_type: v as "man" | "auto",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="man">دنده‌ای</SelectItem>
                              <SelectItem value="auto">اتوماتیک</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── اطلاعات خودرو (موجود) ── */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">اطلاعات خودرو</span>
                      {!editingCar ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditCarForm({
                              year: String(selectedCar.manufacturing_year ?? ""),
                              mileage: String(selectedCar.last_mileage ?? ""),
                            })
                            setEditingCar(true)
                          }}
                        >
                          <Edit2 className="size-3.5" /> ویرایش
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => setEditingCar(false)}
                          >
                            انصراف
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={editingCarLoading}
                            onClick={handleApplyCarEdit}
                          >
                            {editingCarLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            اعمال تغییرات
                          </Button>
                        </div>
                      )}
                    </div>

                    {!editingCar ? (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">کارکرد:</span>
                          <span className="font-medium">
                            {toFa(String(selectedCar.last_mileage ?? "—"))} کیلومتر
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">سال ساخت:</span>
                          <span className="font-medium">
                            {toFa(String(selectedCar.manufacturing_year ?? "—"))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>سال ساخت</Label>
                          <Input
                            inputMode="numeric"
                            value={editCarForm.year}
                            onChange={(e) =>
                              setEditCarForm((f) => ({
                                ...f,
                                year: e.target.value.replace(/\D/g, ""),
                              }))
                            }
                            placeholder="۱۴۰۰"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>کارکرد (کیلومتر)</Label>
                          <Input
                            inputMode="numeric"
                            value={editCarForm.mileage}
                            onChange={(e) =>
                              setEditCarForm((f) => ({
                                ...f,
                                mileage: e.target.value.replace(/\D/g, ""),
                              }))
                            }
                            placeholder="۱۲۰۰۰۰"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── بخش مالک (موجود) ── */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <span className="text-sm font-semibold">مالک خودرو</span>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      {(selectedCar.owner?.profile?.first_name || selectedCar.owner?.profile?.last_name) && (
                        <div className="flex gap-2 col-span-2">
                          <span className="text-muted-foreground">نام:</span>
                          <span className="font-medium">
                            {selectedCar.owner?.profile?.first_name}{" "}
                            {selectedCar.owner?.profile?.last_name}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">تلفن:</span>
                        <span className="font-medium">
                          {toFa(selectedCar.owner?.phone ?? "—")}
                        </span>
                      </div>
                      {selectedCar.owner?.profile?.email && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">ایمیل:</span>
                          <span className="font-medium">
                            {selectedCar.owner.profile.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── توضیحات ویزیت ── */}
                  <div className="space-y-1.5">
                    <Label>مشکل اعلام‌شده / توضیحات ویزیت</Label>
                    <Input
                      value={visitDescription}
                      onChange={(e) => setVisitDescription(e.target.value)}
                      placeholder="مثلاً صدای غیرعادی از موتور"
                    />
                  </div>
                </div>
              ) : (
                /* ────────── ماشین جدید ────────── */
                <div className="space-y-5">

                  {/* ── بخش مالک (جداگانه و برجسته) ── */}
                  <div className="rounded-xl border-2 border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
                        {selectedOwner ? (
                          <UserCheck className="size-4 text-primary" />
                        ) : (
                          <UserPlus className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-semibold">مشخصات مالک</span>
                    </div>

                    {/* نمایش مالک انتخاب‌شده */}
                    {selectedOwner && !showNewOwnerForm ? (
                      <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm">
                        <div>
                          <div className="font-medium">
                            {selectedOwner.profile?.first_name}{" "}
                            {selectedOwner.profile?.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {toFa(selectedOwner.phone)}
                            {selectedOwner.profile?.email && ` · ${selectedOwner.profile.email}`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedOwner(null)
                            setOwnerForm(emptyOwner)
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* فیلد جستجو با شماره تلفن */}
                        <div className="relative space-y-1.5">
                          <Label>شماره تلفن مالک</Label>
                          <div className="relative">
                            <Input
                              inputMode="numeric"
                              value={ownerForm.phone}
                              onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                              placeholder="۰۹۱۲..."
                              className="pl-8"
                            />
                            {ownerSearchLoading ? (
                              <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                            ) : (
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            )}
                          </div>

                          {/* dropdown نتایج جستجوی مالک */}
                          {ownerDropOpen && (
                            <div className="absolute z-20 w-full rounded-xl border border-border bg-card shadow-lg">
                              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                                <Search className="size-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {ownerSearchLoading
                                    ? "در حال جستجو..."
                                    : ownerSearchResults.length > 0
                                    ? `${ownerSearchResults.length} کاربر یافت شد`
                                    : "کاربری یافت نشد"}
                                </span>
                                <button
                                  onClick={() => setOwnerDropOpen(false)}
                                  className="mr-auto text-muted-foreground hover:text-foreground"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                              {ownerSearchLoading ? (
                                <div className="flex items-center justify-center py-5">
                                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                <ul className="max-h-44 divide-y divide-border overflow-y-auto">
                                  {ownerSearchResults.map((user) => (
                                    <li key={user.id}>
                                      <button
                                        onClick={() => handleSelectOwner(user)}
                                        className="w-full px-4 py-2.5 text-right text-sm transition-colors hover:bg-accent"
                                      >
                                        <div className="font-medium">
                                          {user.profile?.first_name} {user.profile?.last_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {toFa(user.phone)}
                                          {user.profile?.email && ` · ${user.profile.email}`}
                                        </div>
                                      </button>
                                    </li>
                                  ))}
                                  <li>
                                    <button
                                      onClick={handleNewOwner}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-primary hover:bg-accent"
                                    >
                                      <UserPlus className="size-4" />
                                      ثبت مالک جدید با این شماره
                                    </button>
                                  </li>
                                </ul>
                              )}
                            </div>
                          )}
                        </div>

                        {/* فرم مالک جدید */}
                        {(showNewOwnerForm || (ownerForm.phone.length >= 3 && ownerSearchResults.length === 0 && !ownerSearchLoading && !ownerDropOpen)) && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1.5">
                              <Label>نام</Label>
                              <Input
                                value={ownerForm.first_name}
                                onChange={(e) => setOwn("first_name", e.target.value)}
                                placeholder="علی"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>نام خانوادگی</Label>
                              <Input
                                value={ownerForm.last_name}
                                onChange={(e) => setOwn("last_name", e.target.value)}
                                placeholder="محمدی"
                              />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                              <Label>ایمیل</Label>
                              <Input
                                type="email"
                                value={ownerForm.email}
                                onChange={(e) => setOwn("email", e.target.value)}
                                placeholder="ali@gmail.com"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* ── اطلاعات فنی خودرو ── */}
                  <div className="space-y-4">
                    <p className="text-sm font-semibold">اطلاعات فنی خودرو</p>

                    {/* جستجوی مدل */}
                    <div className="space-y-1.5">
                      <Label>مدل خودرو *</Label>
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
                          placeholder="جستجو: ایران خودرو، پژو ۴۰۵، ۱۳۹۵..."
                          className="pl-8"
                        />
                        <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>

                      {modelDropOpen && (
                        <div className="rounded-xl border border-border bg-card shadow-lg">
                          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                            <Search className="size-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {modelsLoading
                                ? "در حال بارگذاری..."
                                : `${filteredModels.length} مدل`}
                            </span>
                            <button
                              onClick={() => setModelDropOpen(false)}
                              className="mr-auto text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          {modelsLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <ul className="max-h-44 divide-y divide-border overflow-y-auto">
                              {filteredModels.map((m) => (
                                <li key={m.id}>
                                  <button
                                    onClick={() => handleSelectModel(m)}
                                    className="w-full px-4 py-2.5 text-right text-sm transition-colors hover:bg-accent"
                                  >
                                    <span className="font-medium">
                                      {m.make} {m.model}
                                    </span>
                                    <span className="mr-2 text-xs text-muted-foreground">
                                      {m.model_year} ·{" "}
                                      {m.transmission_type === "man" ? "دنده‌ای" : "اتوماتیک"}
                                    </span>
                                  </button>
                                </li>
                              ))}
                              <li>
                                <button
                                  onClick={() => {
                                    setIsNewModel(true)
                                    setSelectedModel(null)
                                    setModelDropOpen(false)
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-primary hover:bg-accent"
                                >
                                  <Plus className="size-4" />
                                  ثبت مدل جدید: &laquo;{modelSearch || "..."}&raquo;
                                </button>
                              </li>
                            </ul>
                          )}
                        </div>
                      )}

                      {selectedModel && !isNewModel && (
                        <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                          <span>
                            {selectedModel.make} {selectedModel.model} —{" "}
                            {selectedModel.model_year}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedModel(null)
                              setModelSearch("")
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* فرم مدل جدید */}
                    {isNewModel && (
                      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                        <p className="text-sm font-semibold text-primary">مشخصات مدل جدید</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>سازنده *</Label>
                            <Input
                              value={newModelForm.make}
                              onChange={(e) => setNm("make", e.target.value)}
                              placeholder="ایران خودرو"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>مدل *</Label>
                            <Input
                              value={newModelForm.model}
                              onChange={(e) => setNm("model", e.target.value)}
                              placeholder="پژو ۴۰۵"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>سال مدل *</Label>
                            <Input
                              inputMode="numeric"
                              value={newModelForm.model_year}
                              onChange={(e) =>
                                setNm("model_year", e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="۱۳۹۵"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>گیربکس</Label>
                            <Select
                              value={newModelForm.transmission_type}
                              onValueChange={(v) => setNm("transmission_type", v ?? "man")}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="man">دنده‌ای</SelectItem>
                                <SelectItem value="auto">اتوماتیک</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* سایر اطلاعات فنی */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>سال ساخت</Label>
                        <Input
                          inputMode="numeric"
                          value={form.year}
                          onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))}
                          placeholder="۱۴۰۰"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>کارکرد (کیلومتر)</Label>
                        <Input
                          inputMode="numeric"
                          value={form.mileage}
                          onChange={(e) => set("mileage", e.target.value.replace(/\D/g, ""))}
                          placeholder="۵۰۰۰۰"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>مشکل اعلام‌شده / توضیحات ویزیت</Label>
                      <Input
                        value={form.note}
                        onChange={(e) => set("note", e.target.value)}
                        placeholder="مثلاً صدای غیرعادی از موتور"
                      />
                    </div>
                  </div>
                </div>
              )}

              {submitError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (step === "plate") setOpen(false)
              else setStep("plate")
            }}
          >
            {step === "plate" ? "انصراف" : "مرحله قبل"}
          </Button>

          {step === "plate" && (
            <Button
              onClick={() => setStep("info")}
              disabled={!plateValid}
              className="gap-2 font-semibold"
            >
              ادامه
            </Button>
          )}

          {step === "info" && selectedCar && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> در حال ذخیره...
                </>
              ) : (
                <>
                  <Check className="size-4" /> ثبت ورود به گاراژ
                </>
              )}
            </Button>
          )}

          {step === "info" && !selectedCar && (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !modelValid}
              className="gap-2 font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> در حال ذخیره...
                </>
              ) : (
                <>
                  <Plus className="size-4" /> ثبت خودروی جدید
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
