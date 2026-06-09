"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react"
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
import { PLATE_LETTERS, type ApiCar, type ApiCarModel } from "@/lib/types"
import { toFa } from "@/lib/format"
import { useGarage } from "@/components/garage-provider"
import { LicensePlate } from "@/components/license-plate"
import { fetchCars, fetchModels, createCar, updateCar, createModel, updateModel, createVisit, type CreateCarPayload, type UpdateCarPayload } from "@/lib/api"

// ------------------- state اولیه -------------------
const emptyForm = {
  twoDigits: "",
  letter: "ب",
  threeDigits: "",
  region: "",
  color: "",
  year: "",
  ownerPhone: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerEmail: "",
  mileage: "",
  note: "",
}

const emptyModel = {
  make: "",
  model: "",
  model_year: "",
  transmission_type: "man" as "man" | "auto",
}

type Step = "plate" | "info"

// ------------------- کامپوننت -------------------
export function AddCarDialog() {
  const { addCar } = useGarage()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("plate")

  // فرم اصلی
  const [form, setForm] = useState(emptyForm)
  const set = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  // دوربین
  const [camActive, setCamActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // جستجوی خودرو با پلاک
  const [allCars, setAllCars] = useState<ApiCar[]>([])
  const [carsLoading, setCarsLoading] = useState(false)
  const [plateDropOpen, setPlateDropOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState<ApiCar | null>(null) // ماشین انتخاب‌شده از API

  // جستجوی مدل
  const [allModels, setAllModels] = useState<ApiCarModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const [modelDropOpen, setModelDropOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ApiCarModel | null>(null)
  const [isNewModel, setIsNewModel] = useState(false)
  const [newModelForm, setNewModelForm] = useState(emptyModel)
  const setNm = (key: keyof typeof emptyModel, value: string) =>
    setNewModelForm((f) => ({ ...f, [key]: value }))

  // حالت ادیت مدل (وقتی مدل موجود انتخاب شده)
  const [editingModel, setEditingModel] = useState(false)
  const [editModelForm, setEditModelForm] = useState(emptyModel)
  const setEm = (key: keyof typeof emptyModel, value: string) =>
    setEditModelForm((f) => ({ ...f, [key]: value }))

  // حالت ادیت اطلاعات ماشین (وقتی ماشین موجود انتخاب شده)
  const [editingCar, setEditingCar] = useState(false)

  // توضیحات ویزیت
  const [visitDescription, setVisitDescription] = useState("")

  // وضعیت submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // بارگذاری لیست خودروها هنگام باز شدن دیالوگ
  useEffect(() => {
    if (!open) return
    setCarsLoading(true)
    fetchCars()
      .then(setAllCars)
      .catch(() => {})
      .finally(() => setCarsLoading(false))
  }, [open])

  // بارگذاری لیست مدل‌ها هنگام رفتن به مرحله دوم
  useEffect(() => {
    if (step !== "info") return
    setModelsLoading(true)
    fetchModels()
      .then(setAllModels)
      .catch(() => {})
      .finally(() => setModelsLoading(false))
  }, [step])

  // ------------------- فیلتر پلاک -------------------
  const plateQuery = `${form.twoDigits}${form.letter !== "ب" ? form.letter : ""}${form.threeDigits}${form.region}`
    .replace(/\s/g, "")
    .toLowerCase()

  const filteredCars = plateQuery.length < 1
    ? []
    : allCars.filter((c) => {
        const pn = c.plate_number.toLowerCase()
        const combined =
          `${c.plate_first}${c.plate_letter}${c.plate_second}${c.plate_region}`.toLowerCase()
        return pn.includes(plateQuery) || combined.includes(plateQuery)
      })

  // ------------------- فیلتر مدل -------------------
  const filteredModels = modelSearch.length < 1
    ? allModels.slice(0, 8)
    : allModels.filter(
        (m) =>
          m.make.includes(modelSearch) ||
          m.model.includes(modelSearch) ||
          String(m.model_year).includes(modelSearch),
      )

  // ------------------- انتخاب ماشین از dropdown -------------------
  const handleSelectCar = useCallback((car: ApiCar) => {
    setSelectedCar(car)
    setPlateDropOpen(false)
    setEditingModel(false)
    setEditingCar(false)
    setForm({
      twoDigits: String(car.plate_first),
      letter: car.plate_letter,
      threeDigits: String(car.plate_second),
      region: String(car.plate_region),
      color: "",
      year: String(car.manufacturing_year),
      ownerPhone: car.owner.phone,
      ownerFirstName: car.owner.profile?.first_name ?? "",
      ownerLastName: car.owner.profile?.last_name ?? "",
      ownerEmail: car.owner.profile?.email ?? "",
      mileage: String(car.last_mileage),
      note: "",
    })
    // پر کردن فرم ادیت مدل با اطلاعات مدل فعلی ماشین
    setSelectedModel(car.model)
    setModelSearch(`${car.model.make} ${car.model.model} ${car.model.model_year}`)
    setEditModelForm({
      make: car.model.make,
      model: car.model.model,
      model_year: String(car.model.model_year),
      transmission_type: (car.model.transmission_type as "man" | "auto") ?? "man",
    })
  }, [])

  // ------------------- انتخاب مدل از dropdown -------------------
  const handleSelectModel = useCallback((model: ApiCarModel) => {
    setSelectedModel(model)
    setIsNewModel(false)
    setModelDropOpen(false)
    setModelSearch(`${model.make} ${model.model} ${model.model_year}`)
  }, [])

  // ------------------- دوربین -------------------
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamActive(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamActive(true)
    } catch {
      alert("دسترسی به دوربین امکان‌پذیر نیست. پلاک را دستی وارد کنید.")
    }
  }

  const capturePlate = () => {
    setScanning(true)
    setTimeout(() => {
      const two = String(Math.floor(10 + Math.random() * 89))
      const three = String(Math.floor(100 + Math.random() * 899))
      const region = String(Math.floor(10 + Math.random() * 89))
      const letter = PLATE_LETTERS[Math.floor(Math.random() * 12)]
      setForm((f) => ({ ...f, twoDigits: two, letter, threeDigits: three, region }))
      setScanning(false)
      stopCamera()
    }, 1600)
  }

  // ------------------- ریست -------------------
  const reset = () => {
    setForm(emptyForm)
    setSelectedCar(null)
    setSelectedModel(null)
    setIsNewModel(false)
    setModelSearch("")
    setNewModelForm(emptyModel)
    setEditModelForm(emptyModel)
    setEditingModel(false)
    setEditingCar(false)
    setVisitDescription("")
    setPlateDropOpen(false)
    setModelDropOpen(false)
    setStep("plate")
    setSubmitError("")
    stopCamera()
  }

  // ------------------- اعتبارسنجی -------------------
  const plateValid =
    form.twoDigits.length >= 1 &&
    form.threeDigits.length >= 1 &&
    form.region.length >= 1

  const modelValid = selectedModel !== null || (isNewModel && newModelForm.make.trim() && newModelForm.model.trim() && newModelForm.model_year)

  // ------------------- آپدیت مدل (PATCH) -------------------
  const handleUpdateModel = async () => {
    if (!selectedModel) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const updated = await updateModel(selectedModel.id, {
        make: editModelForm.make,
        model: editModelForm.model,
        model_year: Number(editModelForm.model_year),
        transmission_type: editModelForm.transmission_type,
      })
      setSelectedModel(updated)
      setModelSearch(`${updated.make} ${updated.model} ${updated.model_year}`)
      setEditingModel(false)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "خطا در به‌روزرسانی مدل")
    } finally {
      setSubmitting(false)
    }
  }

  // ------------------- آپدیت ماشین (PATCH) -------------------
  const handleUpdateCar = async () => {
    if (!selectedCar) return
    setSubmitting(true)
    setSubmitError("")
    try {
      const payload: UpdateCarPayload = {}
      if (form.year) payload.manufacturing_year = Number(form.year)
      if (form.mileage) payload.last_mileage = Number(form.mileage)
      await updateCar(selectedCar.id, payload)
      setEditingCar(false)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "خطا در به‌روزرسانی خودرو")
    } finally {
      setSubmitting(false)
    }
  }

  // ------------------- ارسال نهایی -------------------
  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      let finalCarId: number

      if (selectedCar) {
        // ماشین موجود — آپدیت مدل (اگر تغییر کرده) و سپس visit
        finalCarId = selectedCar.id
        const updatePayload: UpdateCarPayload = {}
        if (form.year) updatePayload.manufacturing_year = Number(form.year)
        if (form.mileage) updatePayload.last_mileage = Number(form.mileage)
        // اگر مدل جدیدی انتخاب یا ساخته شده، آن را هم آپدیت کن
        if (isNewModel) {
          const createdModel = await createModel({
            make: newModelForm.make,
            model: newModelForm.model,
            model_year: Number(newModelForm.model_year),
            transmission_type: newModelForm.transmission_type,
          })
          updatePayload.model = createdModel.id
        } else if (selectedModel && selectedModel.id !== selectedCar.model?.id) {
          updatePayload.model = selectedModel.id
        }
        if (Object.keys(updatePayload).length > 0) {
          await updateCar(selectedCar.id, updatePayload)
        }

        // اضافه کردن به state داخلی گاراژ
        const ownerFullName = [
          selectedCar.owner.profile?.first_name,
          selectedCar.owner.profile?.last_name,
        ].filter(Boolean).join(" ")
        addCar({
          plate: {
            twoDigits: String(selectedCar.plate_first),
            letter: selectedCar.plate_letter,
            threeDigits: String(selectedCar.plate_second),
            region: String(selectedCar.plate_region),
          },
          brand: selectedCar.model?.make ?? "",
          model: selectedCar.model?.model ?? "",
          color: form.color,
          year: String(selectedCar.manufacturing_year),
          ownerName: ownerFullName,
          ownerPhone: selectedCar.owner.phone,
          ownerEmail: selectedCar.owner.profile?.email,
          note: form.note,
        })
      } else {
        // ماشین جدید — ابتدا مدل، سپس ماشین
        let modelId: number

        if (isNewModel || !selectedModel) {
          const createdModel = await createModel({
            make: newModelForm.make,
            model: newModelForm.model,
            model_year: Number(newModelForm.model_year),
            transmission_type: newModelForm.transmission_type,
          })
          modelId = createdModel.id
        } else {
          modelId = selectedModel.id
        }

        // POST ماشین جدید
        const carPayload: CreateCarPayload = {
          model: modelId,
          plate_first: Number(form.twoDigits),
          plate_letter: form.letter,
          plate_second: Number(form.threeDigits),
          plate_region: Number(form.region),
          ...(form.ownerPhone && { owner: form.ownerPhone }),
          ...(form.year && { manufacturing_year: Number(form.year) }),
          ...(form.mileage && { last_mileage: Number(form.mileage) }),
        }
        const createdCar = await createCar(carPayload)
        finalCarId = createdCar.id

        const ownerFullName = [form.ownerFirstName, form.ownerLastName].filter(Boolean).join(" ")
        addCar({
          plate: {
            twoDigits: form.twoDigits,
            letter: form.letter,
            threeDigits: form.threeDigits,
            region: form.region,
          },
          brand: createdCar.model?.make ?? newModelForm.make,
          model: createdCar.model?.model ?? newModelForm.model,
          color: form.color,
          year: form.year,
          ownerName: ownerFullName,
          ownerPhone: form.ownerPhone,
          ownerEmail: form.ownerEmail || undefined,
          note: form.note,
        })
      }

      // POST ویزیت
      await createVisit(finalCarId, visitDescription || form.note || "")

      reset()
      setOpen(false)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "خطایی رخ داد. دوباره تلاش کنید.")
    } finally {
      setSubmitting(false)
    }
  }

  // ------------------- رندر -------------------
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
              : "اطلاعات خودرو و مدل را تکمیل کنید."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* ====== مرحله ۱: پلاک ====== */}
          {step === "plate" && (
            <>
              {/* دوربین */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">ثبت پلاک با دوربین</span>
                  {camActive ? (
                    <Button variant="ghost" size="sm" onClick={stopCamera} className="gap-1.5 text-destructive">
                      <CameraOff className="size-4" /> خاموش کردن
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={startCamera} className="gap-1.5">
                      <Camera className="size-4" /> روشن کردن دوربین
                    </Button>
                  )}
                </div>
                {camActive && (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-lg bg-black">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
                      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-lg border-2 border-dashed border-primary/80" />
                    </div>
                    <Button onClick={capturePlate} disabled={scanning} className="w-full gap-2">
                      {scanning ? <><Loader2 className="size-4 animate-spin" /> در حال تشخیص...</> : <><Camera className="size-4" /> گرفتن عکس و تشخیص پلاک</>}
                    </Button>
                  </div>
                )}
              </div>

              {/* پیش‌نمایش پلاک */}
              <div className="flex justify-center">
                <LicensePlate
                  plate={{
                    twoDigits: form.twoDigits || "۰۰",
                    letter: form.letter,
                    threeDigits: form.threeDigits || "۰۰۰",
                    region: form.region || "۰۰",
                  }}
                  size="lg"
                />
              </div>

              {/* ورود دستی پلاک */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>دو رقم</Label>
                  <Input
                    inputMode="numeric" maxLength={2}
                    value={form.twoDigits}
                    onChange={(e) => { set("twoDigits", e.target.value.replace(/\D/g, "")); setSelectedCar(null); setPlateDropOpen(true) }}
                    placeholder="۱۲" className="text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>حرف</Label>
                  <Select value={form.letter} onValueChange={(v) => { set("letter", v ?? "ب"); setSelectedCar(null) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATE_LETTERS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>سه رقم</Label>
                  <Input
                    inputMode="numeric" maxLength={3}
                    value={form.threeDigits}
                    onChange={(e) => { set("threeDigits", e.target.value.replace(/\D/g, "")); setSelectedCar(null); setPlateDropOpen(true) }}
                    placeholder="۳۴۵" className="text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>کد شهر</Label>
                  <Input
                    inputMode="numeric" maxLength={2}
                    value={form.region}
                    onChange={(e) => { set("region", e.target.value.replace(/\D/g, "")); setSelectedCar(null); setPlateDropOpen(true) }}
                    placeholder="۱۱" className="text-center"
                  />
                </div>
              </div>

              {/* dropdown جستجوی پلاک */}
              {plateDropOpen && (
                <div className="rounded-xl border border-border bg-card shadow-lg">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {carsLoading ? "در حال جستجو..." : filteredCars.length > 0 ? `${filteredCars.length} خودرو یافت شد` : "خودروی مطابق پیدا نشد"}
                    </span>
                    <button onClick={() => setPlateDropOpen(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                      <X className="size-4" />
                    </button>
                  </div>
                  {carsLoading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!carsLoading && filteredCars.length > 0 && (
                    <ul className="max-h-52 overflow-y-auto divide-y divide-border">
                      {filteredCars.map((car) => (
                        <li key={car.id}>
                          <button
                            onClick={() => handleSelectCar(car)}
                            className="w-full px-4 py-3 text-right transition-colors hover:bg-accent"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-sm">
                                  {car.model.make} {car.model.model}
                                  <span className="mr-2 text-xs text-muted-foreground">{car.model.model_year}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  مالک: {car.owner.phone}
                                  {car.last_mileage > 0 && ` · کارکرد: ${toFa(String(car.last_mileage))} کیلومتر`}
                                </div>
                              </div>
                              <div className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                                {car.plate_number}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!carsLoading && filteredCars.length === 0 && plateQuery.length > 0 && (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                      خودرویی با این پلاک در سیستم ثبت نشده — می‌توانید خودروی جدید ثبت کنید.
                    </div>
                  )}
                </div>
              )}

              {/* نمایش ماشین انتخاب‌شده */}
              {selectedCar && (
                <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
                  <div>
                    <div className="font-semibold text-sm">
                      {selectedCar.model.make} {selectedCar.model.model} — {selectedCar.model.model_year}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedCar.owner.phone} · کارکرد: {toFa(String(selectedCar.last_mileage))} کیلومتر
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/20 px-2 py-1 font-mono text-xs">{selectedCar.plate_number}</span>
                    <button onClick={() => { setSelectedCar(null); setForm(emptyForm) }} className="text-muted-foreground hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ====== مرحله ۲: اطلاعات خودرو ====== */}
          {step === "info" && (
            <>
              {selectedCar ? (
                /* ========== ماشین موجود ========== */
                <div className="space-y-4">
                  {/* --- بخش مدل --- */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">مدل خودرو</span>
                      {!editingModel && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => {
                            setEditingModel(true)
                            setEditModelForm({
                              make: selectedModel?.make ?? "",
                              model: selectedModel?.model ?? "",
                              model_year: String(selectedModel?.model_year ?? ""),
                              transmission_type: (selectedModel?.transmission_type as "man" | "auto") ?? "man",
                            })
                          }}
                        >
                          ادیت مدل
                        </Button>
                      )}
                    </div>

                    {editingModel ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>سازنده</Label>
                            <Input value={editModelForm.make} onChange={(e) => setEm("make", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>مدل</Label>
                            <Input value={editModelForm.model} onChange={(e) => setEm("model", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>سال مدل</Label>
                            <Input inputMode="numeric" value={editModelForm.model_year} onChange={(e) => setEm("model_year", e.target.value.replace(/\D/g, ""))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>گیربکس</Label>
                            <Select value={editModelForm.transmission_type} onValueChange={(v) => setEm("transmission_type", v ?? "man")}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="man">دنده‌ای</SelectItem>
                                <SelectItem value="auto">اتوماتیک</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingModel(false)}>انصراف</Button>
                          <Button size="sm" onClick={handleUpdateModel} disabled={submitting}>
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : "آپدیت مدل"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">سازنده:</span>
                          <span className="font-medium">{selectedModel?.make}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">مدل:</span>
                          <span className="font-medium">{selectedModel?.model}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">سال:</span>
                          <span className="font-medium">{selectedModel?.model_year}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">گیربکس:</span>
                          <span className="font-medium">{selectedModel?.transmission_type === "man" ? "دنده‌ای" : "اتوماتیک"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- بخش اطلاعات ماشین --- */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">اطلاعات خودرو</span>
                      {!editingCar && (
                        <Button variant="outline" size="sm" onClick={() => setEditingCar(true)}>
                          ادیت خودرو
                        </Button>
                      )}
                    </div>

                    {editingCar ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>سال ساخت</Label>
                            <Input inputMode="numeric" value={form.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))} placeholder="۱۴۰۰" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>کارکرد (کیلومتر)</Label>
                            <Input inputMode="numeric" value={form.mileage} onChange={(e) => set("mileage", e.target.value.replace(/\D/g, ""))} placeholder="۵۰۰۰۰" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingCar(false)}>انصراف</Button>
                          <Button size="sm" onClick={handleUpdateCar} disabled={submitting}>
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : "آپدیت خودرو"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        {selectedCar.owner.profile?.first_name && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">نام:</span>
                            <span className="font-medium">
                              {selectedCar.owner.profile.first_name} {selectedCar.owner.profile.last_name}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">تلفن:</span>
                          <span className="font-medium">{toFa(selectedCar.owner.phone)}</span>
                        </div>
                        {selectedCar.owner.profile?.email && (
                          <div className="flex gap-2 col-span-2">
                            <span className="text-muted-foreground">ایمیل:</span>
                            <span className="font-medium">{selectedCar.owner.profile.email}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">کارکرد:</span>
                          <span className="font-medium">{toFa(String(selectedCar.last_mileage))} کیلومتر</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">سال ساخت:</span>
                          <span className="font-medium">{toFa(String(selectedCar.manufacturing_year))}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- توضیحات ویزیت --- */}
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
                /* ========== ماشین جدید ========== */
                <div className="space-y-4">
                  {/* جستجوی مدل */}
                  <div className="space-y-1.5">
                    <Label>مدل خودرو *</Label>
                    <div className="relative">
                      <Input
                        value={modelSearch}
                        onChange={(e) => { setModelSearch(e.target.value); setSelectedModel(null); setIsNewModel(false); setModelDropOpen(true) }}
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
                            {modelsLoading ? "در حال بارگذاری..." : `${filteredModels.length} مدل`}
                          </span>
                          <button onClick={() => setModelDropOpen(false)} className="mr-auto text-muted-foreground hover:text-foreground">
                            <X className="size-4" />
                          </button>
                        </div>
                        {modelsLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <ul className="max-h-44 overflow-y-auto divide-y divide-border">
                            {filteredModels.map((m) => (
                              <li key={m.id}>
                                <button
                                  onClick={() => handleSelectModel(m)}
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
                  </div>

                  {/* فرم مدل جدید */}
                  {isNewModel && (
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm font-semibold text-primary">مشخصات مدل جدید</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>سازنده *</Label>
                          <Input value={newModelForm.make} onChange={(e) => setNm("make", e.target.value)} placeholder="ایران خودرو" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>مدل *</Label>
                          <Input value={newModelForm.model} onChange={(e) => setNm("model", e.target.value)} placeholder="پژو ۴۰۵" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>سال مدل *</Label>
                          <Input inputMode="numeric" value={newModelForm.model_year} onChange={(e) => setNm("model_year", e.target.value.replace(/\D/g, ""))} placeholder="۱۳۹۵" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>گیربکس</Label>
                          <Select value={newModelForm.transmission_type} onValueChange={(v) => setNm("transmission_type", v ?? "man")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="man">دنده‌ای</SelectItem>
                              <SelectItem value="auto">اتوماتیک</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* اطلاعات تکمیلی ماشین جدید */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>رنگ</Label>
                      <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="مثلاً سفید" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>سال ساخت</Label>
                      <Input inputMode="numeric" value={form.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))} placeholder="۱۴۰۰" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>نام مالک</Label>
                      <Input value={form.ownerFirstName} onChange={(e) => set("ownerFirstName", e.target.value)} placeholder="علی" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>نام خانوادگی مالک</Label>
                      <Input value={form.ownerLastName} onChange={(e) => set("ownerLastName", e.target.value)} placeholder="محمدی" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>شماره تماس مالک</Label>
                      <Input inputMode="numeric" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value.replace(/\D/g, ""))} placeholder="۰۹۱۲..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>ایمیل مالک</Label>
                      <Input type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} placeholder="ali@gmail.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>کارکرد (کیلومتر)</Label>
                      <Input inputMode="numeric" value={form.mileage} onChange={(e) => set("mileage", e.target.value.replace(/\D/g, ""))} placeholder="۵۰۰۰۰" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>مشکل اعلام‌شده / توضیحات ویزیت</Label>
                    <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="مثلاً صدای غیرعادی از موتور" />
                  </div>
                </div>
              )}

              {submitError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => step === "plate" ? setOpen(false) : setStep("plate")}>
            {step === "plate" ? "انصراف" : "مرحله قبل"}
          </Button>

          {step === "plate" && (
            <Button onClick={() => setStep("info")} disabled={!plateValid} className="gap-2 font-semibold">
              ادامه — اطلاعات خودرو
            </Button>
          )}

          {step === "info" && selectedCar && (
            <Button onClick={handleSubmit} disabled={submitting || !modelValid} className="gap-2 font-semibold">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> در حال ذخیره...</> : <><Check className="size-4" /> به‌روزرسانی و ورود به گاراژ</>}
            </Button>
          )}

          {step === "info" && !selectedCar && (
            <Button onClick={handleSubmit} disabled={submitting || !modelValid} className="gap-2 font-semibold">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> در حال ذخیره...</> : <><Plus className="size-4" /> ثبت خودروی جدید</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
