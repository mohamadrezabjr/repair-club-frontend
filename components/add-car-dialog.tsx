"use client"

import { useRef, useState } from "react"
import { Camera, CameraOff, Check, Loader2, Plus } from "lucide-react"
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
import { PLATE_LETTERS } from "@/lib/types"
import { toFa } from "@/lib/format"
import { useGarage } from "@/components/garage-provider"
import { LicensePlate } from "@/components/license-plate"

const empty = {
  twoDigits: "",
  letter: "ب",
  threeDigits: "",
  region: "",
  brand: "",
  model: "",
  color: "",
  year: "",
  ownerName: "",
  ownerPhone: "",
  note: "",
}

export function AddCarDialog() {
  const { addCar } = useGarage()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [camActive, setCamActive] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

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
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamActive(true)
    } catch {
      alert("دسترسی به دوربین امکان‌پذیر نیست. لطفاً پلاک را دستی وارد کنید.")
    }
  }

  // شبیه‌سازی تشخیص پلاک از تصویر دوربین
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

  const reset = () => {
    setForm(empty)
    stopCamera()
  }

  const canSubmit =
    form.twoDigits.length >= 1 &&
    form.threeDigits.length >= 1 &&
    form.region.length >= 1 &&
    form.brand.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    addCar({
      plate: {
        twoDigits: form.twoDigits,
        letter: form.letter,
        threeDigits: form.threeDigits,
        region: form.region,
      },
      brand: form.brand,
      model: form.model,
      color: form.color,
      year: form.year,
      ownerName: form.ownerName,
      ownerPhone: form.ownerPhone,
      note: form.note,
    })
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger render={<Button size="lg" className="gap-2 font-semibold" />}>
        <Plus className="size-5" />
        ثبت خودروی جدید
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl">ثبت خودروی ورودی به گاراژ</DialogTitle>
          <DialogDescription>
            پلاک را با دوربین اسکن کنید یا به‌صورت دستی وارد نمایید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* بخش دوربین */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">ثبت پلاک با دوربین</span>
              {camActive ? (
                <Button variant="ghost" size="sm" onClick={stopCamera} className="gap-1.5 text-destructive">
                  <CameraOff className="size-4" />
                  خاموش کردن
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={startCamera} className="gap-1.5">
                  <Camera className="size-4" />
                  روشن کردن دوربین
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
                  {scanning ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      در حال تشخیص پلاک...
                    </>
                  ) : (
                    <>
                      <Camera className="size-4" />
                      گرفتن عکس و تشخیص پلاک
                    </>
                  )}
                </Button>
              </div>
            )}

            {!camActive && (form.twoDigits || form.threeDigits) && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Check className="size-4" />
                پلاک ثبت شد — در صورت نیاز ویرایش کنید.
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
                inputMode="numeric"
                maxLength={2}
                value={form.twoDigits}
                onChange={(e) => set("twoDigits", toFa(e.target.value.replace(/\D/g, "")))}
                placeholder="۱۲"
                className="text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label>حرف</Label>
              <Select value={form.letter} onValueChange={(v) => set("letter", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATE_LETTERS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>سه رقم</Label>
              <Input
                inputMode="numeric"
                maxLength={3}
                value={form.threeDigits}
                onChange={(e) => set("threeDigits", toFa(e.target.value.replace(/\D/g, "")))}
                placeholder="۳۴۵"
                className="text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label>کد شهر</Label>
              <Input
                inputMode="numeric"
                maxLength={2}
                value={form.region}
                onChange={(e) => set("region", toFa(e.target.value.replace(/\D/g, "")))}
                placeholder="۱۱"
                className="text-center"
              />
            </div>
          </div>

          <Separator />

          {/* اطلاعات خودرو */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>برند / نوع خودرو *</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="مثلاً پژو" />
            </div>
            <div className="space-y-1.5">
              <Label>مدل</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="مثلاً ۲۰۶ تیپ ۵" />
            </div>
            <div className="space-y-1.5">
              <Label>رنگ</Label>
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="مثلاً سفید" />
            </div>
            <div className="space-y-1.5">
              <Label>سال ساخت</Label>
              <Input
                inputMode="numeric"
                value={form.year}
                onChange={(e) => set("year", toFa(e.target.value.replace(/\D/g, "")))}
                placeholder="۱۴۰۰"
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام مالک</Label>
              <Input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="نام و نام خانوادگی" />
            </div>
            <div className="space-y-1.5">
              <Label>شماره تماس</Label>
              <Input
                inputMode="numeric"
                value={form.ownerPhone}
                onChange={(e) => set("ownerPhone", toFa(e.target.value.replace(/\D/g, "")))}
                placeholder="۰۹۱۲..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>توضیحات اولیه / مشکل اعلام‌شده</Label>
            <Input value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="مثلاً صدای غیرعادی از موتور" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2 font-semibold">
            <Check className="size-4" />
            ثبت خودرو در گاراژ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
