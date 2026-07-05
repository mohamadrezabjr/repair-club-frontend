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
import { PLATE_LETTERS, type ApiCar, type ApiCarModel, type ApiUser } from "@/lib/types"
import { toFa } from "@/lib/format"
import { LicensePlate } from "@/components/license-plate"
import { fetchCars, fetchModels, createCar, updateCar, createModel, updateModel, createVisit, fetchUserByPhone, createUser, type CreateCarPayload, type UpdateCarPayload, type CreateUserPayload } from "@/lib/api"
import { ocrLicensePlate, captureFrame } from "@/lib/ocr"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

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

type Step = "plate" | "owner" | "info"

// ------------------- کامپوننت -------------------
export function AddCarDialog({ onSuccess }: { onSuccess?: () => void } = {}) {
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
  const [ocrError, setOcrError] = useState("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

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

  // جستجو و انتخاب مالک
  const [selectedOwner, setSelectedOwner] = useState<ApiUser | null>(null)
  const [ownerSearchPhone, setOwnerSearchPhone] = useState("")
  const [ownerSearching, setOwnerSearching] = useState(false)
  const [ownerNotFound, setOwnerNotFound] = useState(false)
  const [isNewOwner, setIsNewOwner] = useState(false)

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
          (m.make ?? "").includes(modelSearch) ||
          m.model.includes(modelSearch) ||
          String(m.model_year ?? "").includes(modelSearch),
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
      year: String(car.manufacturing_year ?? ""),
      ownerPhone: car.owner?.phone ?? "",
      ownerFirstName: car.owner?.profile?.first_name ?? "",
      ownerLastName: car.owner?.profile?.last_name ?? "",
      ownerEmail: car.owner?.profile?.email ?? "",
      mileage: String(car.last_mileage ?? ""),
      note: "",
    })
    // پر کردن فرم ادیت مدل با اطلاعات مدل فعلی ماشین
    setSelectedModel(car.model ?? null)
    if (car.model) {
      setModelSearch(
        `${car.model.make ?? ""} ${car.model.model} ${car.model.model_year ?? ""}`.trim(),
      )
      setEditModelForm({
        make: car.model.make ?? "",
        model: car.model.model,
        model_year: car.model.model_year != null ? String(car.model.model_year) : "",
        transmission_type: (car.model.transmission_type as "man" | "auto") ?? "man",
      })
    } else {
      setModelSearch("")
      setEditModelForm(emptyModel)
    }
  }, [])

  // ------------------- انتخاب مدل از dropdown -------------------
  const handleSelectModel = useCallback((model: ApiCarModel) => {
    setSelectedModel(model)
    setIsNewModel(false)
    setModelDropOpen(false)
    setModelSearch(`${model.make ?? ""} ${model.model} ${model.model_year ?? ""}`.trim())
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
      // ابتدا camActive را true می‌کنیم تا المنت <video> رندر شود
      // سپس در useEffect زیر، stream به آن اختصاص بده
      setCamActive(true)
    } catch {
      alert("دسترسی به دوربین امکان‌پذیر نیست. پلاک را دستی وارد کنید.")
    }
  }

  // وقتی camActive true شد و المنت <video> در DOM رندر شد، stream را به آن اختصاص بده
  useEffect(() => {
    if (camActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camActive])

  // Preprocess the captured image to improve OCR accuracy
  const preprocessImage = async (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);

        // Convert to grayscale and apply contrast enhancement
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Step 1: Grayscale conversion
        const gray = new Uint8ClampedArray(data.length / 4);
        for (let i = 0; i < data.length; i += 4) {
          gray[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }

        // Step 2: Adaptive thresholding (Otsu's method approximation)
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < gray.length; i++) histogram[gray[i]]++;
        const total = gray.length;
        let sumAll = 0;
        for (let i = 0; i < 256; i++) sumAll += i * histogram[i];
        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 128;
        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;
          wF = total - wB;
          if (wF === 0) break;
          sumB += t * histogram[t];
          const mB = sumB / wB;
          const mF = (sumAll - sumB) / wF;
          const variance = wB * wF * (mB - mF) * (mB - mF);
          if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
          }
        }

        // Apply threshold
        for (let i = 0; i < gray.length; i++) {
          const v = gray[i] > threshold ? 255 : 0;
          data[i * 4] = v;
          data[i * 4 + 1] = v;
          data[i * 4 + 2] = v;
          data[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  };

  // Clean extracted OCR text to match Iranian plate pattern
  const cleanPlateText = (raw: string): string => {
    // Persian/Arabic character mapping to Farsi digits
    const charMap: Record<string, string> = {
      "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
      "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
      "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
      "ۚ": "", "ۛ": "", "۝": "",
    };

    // Normalize characters
    let cleaned = raw.toUpperCase();
    for (const [k, v] of Object.entries(charMap)) cleaned = cleaned.replaceAll(k, v);

    // Remove non-alphanumeric and non-Farsi chars (keep Persian letters and digits)
    const persianPlateLetters = "ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی";

    // Extract segments: two groups of digits, possibly separated by a Persian letter + separator
    const digits = cleaned.replace(/[^0-9۰-۹]/g, "").replace(/[۰-۹]/g, (m) => charMap[m] || m);
    const letters = cleaned.replace(/[^A-Z\u0600-\u06FF]/g, "");

    return `${digits} ${letters}`.trim();
  };

  const capturePlate = async () => {
    if (!videoRef.current || !camActive) return;

    try {
      setScanning(true);

      // Capture frame from video
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(videoRef.current, 0, 0);

      const imageData = canvas.toDataURL("image/png");
      setCapturedImage(imageData);

      // Preprocess the image for better OCR
      const processed = await preprocessImage(imageData);

      // Use Tesseract.js for OCR
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["fas", "eng"], 1);

      const { data } = await worker.recognize(processed);
      await worker.terminate();

      // Try to extract plate number from OCR result
      const rawText = data.text?.trim() || "";
      const confidence = data.confidence || 0;

      console.log("OCR raw text:", rawText, "confidence:", confidence);

      // Try to extract Iranian plate pattern from raw text
      // Iranian plates: XX XXX XX or XX-XXX-XX (2 digits, 1-3 letter, up to 5 digits)
      const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
      const digitPattern = "[0-9" + persianDigits + "]";

      // Normalize Persian digits to English
      let normalized = rawText;
      for (let i = 0; i < 10; i++) {
        const regex = new RegExp(`[${persianDigits[i]}${String.fromCodePoint(0x06F0 + i)}]`, "g");
        normalized = normalized.replace(regex, String(i));
      }

      // Try multiple patterns for Iranian plates
      const platePatterns = [
        // Standard: 2 digits + letter + 3 digits + 2 digits (e.g., 12 الف 345 67)
        new RegExp(`(\\d{2})\\s*[${"ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی".split("").join("")}]\\s*(\\d{3})\\s*(\\d{2})`),
        // Simple: 2 digits + letter(s) + 5 digits
        new RegExp(`(\\d{2})\\s*([A-Z${"ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی"}]+)\\s*(\\d{1,5})`),
        // Any sequence with digits that looks like a plate
        new RegExp(`(\\d{2,3})\\s*[A-Z${"ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی"}]+\\s*(\\d{1,5})`),
        // Fallback: just find any digits that could be a plate
        /(\d{8,9})/,
        /(\d{2}\s*\d{3}\s*\d{2})/,
      ];

      let plateNumber = "";
      let matchFound = false;

      for (const pattern of platePatterns) {
        const match = normalized.match(pattern);
        if (match) {
          plateNumber = match[0].replace(/\s+/g, " ").trim();
          matchFound = true;
          break;
        }
      }

      // If no pattern matched, try to use the raw text directly (cleaned)
      if (!matchFound && normalized.replace(/\s/g, "").length >= 5) {
        // Extract only the most plate-like segment
        const segments = normalized.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
        plateNumber = segments.sort((a, b) => {
          const digitCountA = (a.match(/\d/g) || []).length;
          const digitCountB = (b.match(/\d/g) || []).length;
          return digitCountB - digitCountA;
        })[0] || normalized.replace(/\s+/g, " ").trim();
      }

      // Clean and validate
      plateNumber = plateNumber.replace(/[^0-9A-Z\u0600-\u06FF\s-]/g, "").trim();

      setForm({
        twoDigits: String(plateNumber[0] + plateNumber[1]),
        letter: plateNumber[2],
        threeDigits: String(plateNumber[3] + plateNumber[4]),
        region: String(plateNumber[5] + plateNumber[6]),
        color: "",
        year: String(plateNumber[7] + plateNumber[8]),
        ownerPhone: "",
        ownerFirstName: "",
        ownerLastName: "",
        ownerEmail: "",
        mileage: "",
        note: "",
      })
      setCamActive(false);
      stopCamera();
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("خطا در پردازش تصویر. لطفاً دوباره تلاش کنید.");
      setCamActive(false);
      stopCamera();
    } finally {
      setScanning(false);
    }
  };

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
    setSelectedOwner(null)
    setOwnerSearchPhone("")
    setOwnerSearching(false)
    setOwnerNotFound(false)
    setIsNewOwner(false)
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

  // ------------------- جستجوی مالک -------------------
  const handleSearchOwner = async () => {
    if (!ownerSearchPhone.trim()) return
    setOwnerSearching(true)
    setOwnerNotFound(false)
    setSelectedOwner(null)
    setIsNewOwner(false)
    try {
      const found = await fetchUserByPhone(ownerSearchPhone.trim())
      if (found) {
        setSelectedOwner(found)
        setForm((f) => ({
          ...f,
          ownerPhone: found.phone,
          ownerFirstName: found.profile?.first_name ?? "",
          ownerLastName: found.profile?.last_name ?? "",
          ownerEmail: found.profile?.email ?? "",
        }))
      } else {
        setOwnerNotFound(true)
        setForm((f) => ({ ...f, ownerPhone: ownerSearchPhone.trim() }))
      }
    } finally {
      setOwnerSearching(false)
    }
  }

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
      setModelSearch(`${updated.make ?? ""} ${updated.model} ${updated.model_year ?? ""}`.trim())
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
        // ماشین موجود — فقط visit می‌سازیم
        finalCarId = selectedCar.id
      } else {
        // ماشین جدید

        // ۱. تعیین ownerId
        let ownerId: string | undefined
        if (selectedOwner) {
          ownerId = selectedOwner.id
        } else if (isNewOwner && form.ownerPhone) {
          const userPayload: CreateUserPayload = {
            phone: form.ownerPhone,
            ...(form.ownerFirstName && { first_name: form.ownerFirstName }),
            ...(form.ownerLastName && { last_name: form.ownerLastName }),
            ...(form.ownerEmail && { email: form.ownerEmail }),
          }
          const newUser = await createUser(userPayload)
          ownerId = newUser.id
        }

        // ۲. تعیین modelId
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

        // ۳. POST ماشین جدید
        const carPayload: CreateCarPayload = {
          model: modelId,
          plate_first: Number(form.twoDigits),
          plate_letter: form.letter,
          plate_second: Number(form.threeDigits),
          plate_region: Number(form.region),
          ...(ownerId && { owner: ownerId }),
          ...(form.year && { manufacturing_year: Number(form.year) }),
          ...(form.mileage && { last_mileage: Number(form.mileage) }),
        }
        const createdCar = await createCar(carPayload)
        finalCarId = createdCar.id
      }

      // POST ویزیت
      await createVisit(finalCarId, visitDescription || form.note || "")

      reset()
      setOpen(false)
      onSuccess?.()
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
              : step === "owner"
              ? "شماره مالک را وارد کنید تا جستجو شود، یا مالک جدید ثبت کنید."
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
                  <span className="text-sm font-semibold text-muted-foreground">ثبت لاک با دوربین</span>
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
                      <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => { videoRef.current?.play().catch(() => {}) }} className="aspect-video w-full object-cover" />
                      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-lg border-2 border-dashed border-primary/80" />
                    </div>
                    <Button onClick={capturePlate} disabled={scanning} className="w-full gap-2">
                      {scanning ? <><Loader2 className="size-4 animate-spin" /> در حال تشخیص...</> : <><Camera className="size-4" /> گرفتن عکس و تشخیص پلاک</>}
                    </Button>
                  </div>
                )}
              </div>

              {/* پلاک با ورودی‌های یکپارچه */}
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
                                  {car.model ? `${car.model.make} ${car.model.model}` : "مدل نامشخص"}
                                  {car.model && <span className="mr-2 text-xs text-muted-foreground">{car.model.model_year}</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {car.owner ? `مالک: ${car.owner.phone}` : "مالک نامشخص"}
                                  {(car.last_mileage ?? 0) > 0 && ` · کارکرد: ${toFa(String(car.last_mileage))} کیلومتر`}
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
                      {selectedCar.model
                        ? `${selectedCar.model.make} ${selectedCar.model.model} — ${selectedCar.model.model_year}`
                        : "مدل نامشخص"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedCar.owner?.phone ?? "مالک نامشخص"} · کارکرد: {toFa(String(selectedCar.last_mileage ?? 0))} کیلومتر
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

          {/* ====== مرحله ۲: مالک ====== */}
          {step === "owner" && !selectedCar && (
            <div className="space-y-4">
              {/* جستجوی شماره */}
              <div className="space-y-1.5">
                <Label>شماره تماس مالک</Label>
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    value={ownerSearchPhone}
                    onChange={(e) => {
                      setOwnerSearchPhone(e.target.value.replace(/\D/g, ""))
                      setSelectedOwner(null)
                      setOwnerNotFound(false)
                      setIsNewOwner(false)
                    }}
                    placeholder="۰۹۱۲..."
                    onKeyDown={(e) => e.key === "Enter" && handleSearchOwner()}
                  />
                  <Button variant="secondary" onClick={handleSearchOwner} disabled={ownerSearching || !ownerSearchPhone.trim()}>
                    {ownerSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </Button>
                </div>
              </div>

              {/* یوزر پیدا شد */}
              {selectedOwner && (
                <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">مالک پیدا شد</span>
                    <button onClick={() => { setSelectedOwner(null); setOwnerNotFound(false) }} className="text-muted-foreground hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {selectedOwner.profile?.first_name && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">نام:</span>
                        <span className="font-medium">{selectedOwner.profile.first_name} {selectedOwner.profile.last_name}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">تلفن:</span>
                      <span className="font-medium">{toFa(selectedOwner.phone)}</span>
                    </div>
                    {selectedOwner.profile?.email && (
                      <div className="flex gap-2 col-span-2">
                        <span className="text-muted-foreground">ایمیل:</span>
                        <span className="font-medium">{selectedOwner.profile.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* یوزر پیدا نشد — فرم ثبت جدید */}
              {ownerNotFound && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    کربری با این شماره یافت نشد. می‌توانید مالک جدید ثبت کنید یا بدون مالک ادامه دهید.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isNewOwner ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsNewOwner((v) => !v)}
                    >
                      <Plus className="size-4 ml-1" />
                      {isNewOwner ? "انصراف از ثبت مالک جدید" : "ثبت مالک جدید"}
                    </Button>
                  </div>
                  {isNewOwner && (
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>نام</Label>
                          <Input value={form.ownerFirstName} onChange={(e) => set("ownerFirstName", e.target.value)} placeholder="علی" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>نام خانوادگی</Label>
                          <Input value={form.ownerLastName} onChange={(e) => set("ownerLastName", e.target.value)} placeholder="محمدی" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label>ایمیل</Label>
                          <Input type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} placeholder="ali@gmail.com" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                        {selectedCar.owner?.profile?.first_name && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">نام:</span>
                            <span className="font-medium">
                              {selectedCar.owner.profile.first_name} {selectedCar.owner.profile.last_name}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">تلفن:</span>
                          <span className="font-medium">{toFa(selectedCar.owner?.phone ?? "—")}</span>
                        </div>
                        {selectedCar.owner?.profile?.email && (
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
          <Button
            variant="outline"
            onClick={() => {
              if (step === "plate") setOpen(false)
              else if (step === "owner") setStep("plate")
              else setStep(selectedCar ? "plate" : "owner")
            }}
          >
            {step === "plate" ? "انصراف" : "مرحله قبل"}
          </Button>

          {/* پلاک → مرحله بعد */}
          {step === "plate" && (
            <Button
              onClick={() => setStep(selectedCar ? "info" : "owner")}
              disabled={!plateValid}
              className="gap-2 font-semibold"
            >
              ادامه
            </Button>
          )}

          {/* مالک → اطلاعات خودرو (فقط برای ماشین جدید) */}
          {step === "owner" && !selectedCar && (
            <Button
              onClick={() => setStep("info")}
              disabled={!ownerSearchPhone.trim() && !selectedOwner}
              className="gap-2 font-semibold"
            >
              ادامه — اطلاعات خودرو
            </Button>
          )}

          {/* ماشین موجود — فقط ثبت ویزیت */}
          {step === "info" && selectedCar && (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 font-semibold">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> در حال ذخیره...</> : <><Check className="size-4" /> ثبت ورود به گاراژ</>}
            </Button>
          )}

          {/* ماشین جدید */}
          {step === "info" && !selectedCar && (
            <Button onClick={handleSubmit} disabled={submitting || !modelValid} className="gap-2 font-semibold">
              {submitting ? <><Loader2 className="size-4 animate-spin" /> در حال ذخیره...</> : <><Plus className="size-4" /> ثبت خودروی دید</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
