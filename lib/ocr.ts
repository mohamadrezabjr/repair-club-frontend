import type { Plate } from "./types"
import { PLATE_LETTERS } from "./types"

/**
 * پیش‌پردازش ملایم تصویر برای OCR
 * خاکستری‌سازی + افزایش کنتراست (بدون آستانه‌گذاری تند)
 * هدف: حفظ جزئیات حروف فارسی (نقطه‌ها و منحنی‌ها)
 */
function preprocessImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // 1) خاکستری‌سازی
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }

  // 2) افزایش کنتراست (کشیدن هیستوگرام) — بدون آستانه‌گذاری تند
  let min = 255
  let max = 0
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < min) min = gray[i]
    if (gray[i] > max) max = gray[i]
  }
  const range = max - min || 1
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(((gray[i] - min) / range) * 255)
  }

  // 3) تیز کردن ملایم (Unsharp Mask) — بهبود لبه‌های حروف
  const sharpened = new Uint8ClampedArray(gray.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const center = gray[idx] * 5
      const neighbors =
        gray[(y - 1) * width + x] +
        gray[(y + 1) * width + x] +
        gray[y * width + x - 1] +
        gray[y * width + x + 1]
      sharpened[idx] = Math.min(255, Math.max(0, center - neighbors))
    }
  }

  // 4) نوشتن نتیجه
  for (let i = 0; i < sharpened.length; i++) {
    const idx = i * 4
    data[idx] = sharpened[i]
    data[idx + 1] = sharpened[i]
    data[idx + 2] = sharpened[i]
    data[idx + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * نقشه تبدیل اعداد عربی/انگلیسی به فارسی
 */
const digitMap: Record<string, string> = {
  "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
  "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹",
}

/**
 * نقشه تبدیل اعداد فارسی/عربی به لاتین
 */
const faDigitMap: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
}

/**
 * تبدیل هر کاراکتر عددی (فارسی/عربی/لاتین) به لاتین
 */
function normalizeDigit(ch: string): string {
  return faDigitMap[ch] ?? ch
}

/**
 * تبدیل رشته لاتین به فارسی
 */
function toFaDigits(s: string): string {
  return s.split("").map((c) => digitMap[c] ?? c).join("")
}

/**
 * نقشه تبدیل حروف پلاک فارسی به معادل‌های قابل شناسایی
 */
const persianLetterVariants: Record<string, string[]> = {
  "الف": ["الف", "A"],
  "ب": ["ب", "B", "ب"],
  "پ": ["پ", "P"],
  "ت": ["ت", "T"],
  "ث": ["ث", "S"],
  "ج": ["ج", "J"],
  "د": ["د", "D"],
  "ز": ["ز", "Z"],
  "ژ": ["ژ"],
  "س": ["س", "S"],
  "ش": ["ش"],
  "ص": ["ص"],
  "ط": ["ط"],
  "ع": ["ع", "A"],
  "ق": ["ق", "G"],
  "ل": ["ل", "L"],
  "م": ["م", "M"],
  "ن": ["ن", "N"],
  "و": ["و", "V"],
  "ه": ["ه", "H"],
  "ی": ["ی", "Y"],
}

/**
 * ساخت map معکوس: هر variant -> حرف اصلی فارسی
 */
const variantToLetter: Record<string, string> = {}
for (const [letter, variants] of Object.entries(persianLetterVariants)) {
  for (const v of variants) {
    variantToLetter[v] = letter
  }
}

/**
 * تلاش برای پیدا کردن حرف پلاک در متن OCR
 */
function detectPlateLetter(text: string): string | null {
  // ابتدا حروف فارسی مستقیم رو چک کن
  for (const letter of PLATE_LETTERS) {
    if (text.includes(letter)) return letter
  }

  // بعد variants رو چک کن (مثلاً B -> ب)
  const words = text.split(/\s+/)
  for (const word of words) {
    if (word.length === 1) {
      const mapped = variantToLetter[word]
      if (mapped) return mapped
    }
  }

  return null
}

/**
 * استخراج اعداد از متن (شامل فارسی، عربی، لاتین)
 */
function extractDigits(text: string): string {
  return text
    .split("")
    .map(normalizeDigit)
    .filter((c) => /[0-9]/.test(c))
    .join("")
}

/**
 * نتیجه پارس کردن پلاک — شامل وضعیت موفقیت
 */
export interface PlateParseResult {
  plate: Plate
  success: boolean
  message: string
}

/**
 * نتیجه OCR — شامل وضعیت و اطلاعات خطا
 */
export interface OcrResult {
  plate: Plate
  success: boolean
  message: string
}

/**
 * اعتبارسنجی نتیجه پارس شده پلاک
 */
function validatePlate(result: { twoDigits: string; letter: string; threeDigits: string; region: string }): string | null {
  // بررسی وجود همه فیلدها
  if (!result.twoDigits || !result.letter || !result.threeDigits) {
    return "نتوانستیم اطلاعات کامل پلاک را تشخیص دهیم"
  }

  // بررسی اعداد — باید فقط شامل ارقام باشن
  if (!/^\d{2}$/.test(result.twoDigits)) {
    return "خطا در تشخیص اعداد اول پلاک"
  }

  if (!/^\d{3}$/.test(result.threeDigits)) {
    return "خطا در تشخیص اعداد دوم پلاک"
  }

  // بررسی حرف — باید یکی از حروف مجاز پلاک باشه
  if (!PLATE_LETTERS.includes(result.letter)) {
    return "خطا در تشخیص حرف پلاک"
  }

  // بررسی محدوده اعداد دو رقمی (معمولاً 10-99)
  const twoNum = parseInt(result.twoDigits)
  if (twoNum < 10 || twoNum > 99) {
    return "اعداد اول پلاک نامعتبر است"
  }

  // بررسی محدوده اعداد سه رقمی (معمولاً 100-999)
  const threeNum = parseInt(result.threeDigits)
  if (threeNum < 100 || threeNum > 999) {
    return "اعداد دوم پلاک نامعتبر است"
  }

  // بررسی کد شهر (اختیاری ولی اگه هست باید عدد باشه)
  if (result.region && !/^\d{2}$/.test(result.region)) {
    return "خطا در تشخیص کد شهر"
  }

  return null // بدون خطا
}

/**
 * پارس کردن متن OCR و استخراج اطلاعات پلاک
 */
function parsePlateText(rawText: string): PlateParseResult {
  const text = rawText
    .replace(/[^\w\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, " ")
    .trim()

  console.log("[OCR] Raw text:", rawText)
  console.log("[OCR] Cleaned text:", text)

  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  console.log("[OCR] Lines:", lines)

  let twoDigits = ""
  let threeDigits = ""
  let letter = ""
  let region = ""

  // تلاش ۱: پیدا کردن خطی که الگوی "عدد حرف عدد" داره
  for (const line of lines) {
    const normalized = line
      .replace(/[\s\-\/\\|]+/g, " ")
      .trim()

    // الگو: ۲ رقم + حرف + ۳ رقم (یا لاتین)
    const digits = extractDigits(normalized)
    const detectedLetter = detectPlateLetter(normalized)

    if (detectedLetter && digits.length >= 3) {
      letter = detectedLetter
      // حرف رو از خط حذف کن و فقط اعداد رو بگیر
      const parts = normalized.split(new RegExp(detectedLetter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i"))
      const beforeLetter = extractDigits(parts[0] || "")
      const afterLetter = extractDigits(parts[1] || "")

      if (beforeLetter.length === 2 && afterLetter.length >= 3) {
        twoDigits = beforeLetter
        threeDigits = afterLetter.slice(0, 3)
        // اگه اضافه اومد، ممکنه کد شهر باشه
        if (afterLetter.length >= 5) {
          region = afterLetter.slice(3, 5)
        }
      } else if (digits.length === 5) {
        twoDigits = digits.slice(0, 2)
        threeDigits = digits.slice(2, 5)
      } else if (digits.length >= 5) {
        twoDigits = digits.slice(0, 2)
        threeDigits = digits.slice(2, 5)
        // باقی‌مانده ممکنه کد شهر باشه
        if (digits.length >= 7) {
          region = digits.slice(5, 7)
        }
      }
      break
    }
  }

  // تلاش ۲: اگر حرف پیدا نشد، دنبال خطوط جداگانه بگرد
  if (!twoDigits && !threeDigits) {
    for (const line of lines) {
      const detectedLetter = detectPlateLetter(line)
      if (detectedLetter) {
        letter = detectedLetter
        const digits = extractDigits(line)
        if (digits.length >= 5) {
          twoDigits = digits.slice(0, 2)
          threeDigits = digits.slice(2, 5)
        } else if (digits.length === 4) {
          // ممکنه اول/آخرش حذف شده باشه
          twoDigits = digits.slice(0, 2)
          threeDigits = digits.slice(2)
        }
        break
      }
    }
  }

  // تلاش ۳: فقط اعداد رو جمع‌وجور کن (بدون حرف)
  if (!twoDigits && !threeDigits) {
    let allDigits = ""
    for (const line of lines) {
      allDigits += extractDigits(line)
    }
    if (allDigits.length >= 5) {
      twoDigits = allDigits.slice(0, 2)
      threeDigits = allDigits.slice(2, 5)
    } else if (allDigits.length >= 4) {
      twoDigits = allDigits.slice(0, 2)
      threeDigits = allDigits.slice(2)
    }
  }

  // پیدا کردن کد شهر (ایران XX)
  for (const line of lines) {
    if (/ایران|iran/i.test(line)) {
      const regionDigits = extractDigits(line)
      if (regionDigits.length >= 2) {
        region = regionDigits.slice(0, 2)
      }
    }
  }

  // اگر کد شهر پیدا نشد، دنبال خطی با ۲ رقم بگرد که جدا از خط اصلی باشه
  if (!region) {
    for (const line of lines) {
      const digits = extractDigits(line)
      const hasLetter = detectPlateLetter(line) !== null
      // خطی که فقط ۲ رقم داره و حرفی نداره
      if (!hasLetter && digits.length === 2 && line.length < 10) {
        region = digits
        break
      }
    }
  }

  console.log("[OCR] Parsed:", { twoDigits, letter, threeDigits, region })

  const plate: Plate = {
    twoDigits,
    letter,
    threeDigits,
    region,
  }

  // اعتبارسنجی نتیجه
  const error = validatePlate(plate)
  if (error) {
    console.log("[OCR] Validation failed:", error)
    return { plate, success: false, message: error }
  }

  console.log("[OCR] Validation passed")
  return { plate, success: true, message: "" }
}

/**
 * خواندن پلاک از تصویر دوربین با OCR
 */
export async function ocrLicensePlate(
  video: HTMLVideoElement,
): Promise<PlateParseResult> {
  const { createWorker } = await import("tesseract.js")

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  // استفاده از وضوح بالاتر برای OCR بهتر
  const vw = video.videoWidth
  const vh = video.videoHeight

  // برای پلاک، بخش مرکزی تصویر رو می‌گیریم (معمولاً پلاک وسط دوربینه)
  const cropRatio = 0.6 // 60% مرکز تصویر
  const cropW = Math.floor(vw * cropRatio)
  const cropH = Math.floor(vh * cropRatio)
  const cropX = Math.floor((vw - cropW) / 2)
  const cropY = Math.floor((vh - cropH) / 2)

  // اندازه واقعی برای OCR
  const targetW = Math.min(cropW, 800)
  const targetH = Math.floor((cropH / cropW) * targetW)

  canvas.width = targetW
  canvas.height = targetH

  // رسم بخش مرکزی تصویر
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH)

  // پیش‌پردازش تصویر
  preprocessImage(ctx, targetW, targetH)

  // اجرای OCR با زبان فارسی و انگلیسی
  const worker = await createWorker("fas+eng", undefined, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        console.log(`[OCR] ${Math.round((m.progress ?? 0) * 100)}%`)
      }
    },
  })

  // تنظیمات برای پلاک
  await worker.setParameters({
    tessedit_pageseg_mode: "6", // فرض یک بلوک متن یکپارچه (بهتر برای متن RTL)
  })

  // OCR روی تصویر کامل
  const fullResult = await worker.recognize(canvas)
  const fullText = fullResult.data.text

  // همچنین فقط نیمه پایین تصویر (احتمالاً حاوی کد شهر)
  const bottomCanvas = document.createElement("canvas")
  const bottomCtx = bottomCanvas.getContext("2d")!
  bottomCanvas.width = targetW
  bottomCanvas.height = Math.floor(targetH / 3)
  bottomCtx.drawImage(
    canvas,
    0,
    Math.floor((targetH * 2) / 3),
    targetW,
    Math.floor(targetH / 3),
    0,
    0,
    targetW,
    Math.floor(targetH / 3),
  )

  await worker.setParameters({
    tessedit_pageseg_mode: "7",
  })
  const bottomResult = await worker.recognize(bottomCanvas)
  const bottomText = bottomResult.data.text

  await worker.terminate()

  console.log("[OCR] Full text:", fullText)
  console.log("[OCR] Bottom text:", bottomText)

  // ترکیب متن‌ها برای پارس کردن
  const combinedText = fullText + "\n" + bottomText
  return parsePlateText(combinedText)
}

/**
 * دریافت تصویر کپچر شده از دوربین (برای نمایش به کاربر)
 */
export function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(video, 0, 0)
  return canvas.toDataURL("image/jpeg", 0.85)
}
