import type { Plate } from "./types"
import { PLATE_LETTERS } from "./types"

/**
 * پیش‌پردازش تصویر برای بهبود کیفیت OCR
 * خاکستری‌سازی، افزایش کنتراست، و آستانه‌گذاری
 */
function preprocessImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // 1) خاکستری‌سازی + افزایش کنتراست
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < data.length; i += 4) {
    // فرمول وزنی استاندارد
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[i / 4] = g
  }

  // 2) آستانه‌گذاری ساده (Otsu-like)
  // محاسبه هیستوگرام
  const hist = new Array(256).fill(0) as number[]
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let maxVariance = 0
  let threshold = 0
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += i * hist[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) * (mB - mF)
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = i
    }
  }

  // 3) اعمال آستانه‌گذاری — پلاک زرد روشن‌تر از متن تیره
  // برای پلاک ایران (پس‌زمینه زرد، متن سیاه)، تاریک‌ها رو سیاه و روشن‌ها رو سفید می‌کنیم
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i] > threshold ? 255 : 0
    const idx = i * 4
    data[idx] = v
    data[idx + 1] = v
    data[idx + 2] = v
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
 * پارس کردن متن OCR و استخراج اطلاعات پلاک
 */
function parsePlateText(rawText: string): Plate {
  const text = rawText
    .replace(/[^\w\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, " ")
    .trim()

  console.log("[OCR] Raw text:", rawText)
  console.log("[OCR] Cleaned text:", text)

  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  console.log("[OCR] Lines:", lines)

  let twoDigits = ""
  let threeDigits = ""
  let letter = "ب"
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
      } else if (digits.length === 5) {
        twoDigits = digits.slice(0, 2)
        threeDigits = digits.slice(2, 5)
      } else if (digits.length >= 5) {
        twoDigits = digits.slice(0, 2)
        threeDigits = digits.slice(2, 5)
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

  return {
    twoDigits: twoDigits || "",
    letter: letter || "ب",
    threeDigits: threeDigits || "",
    region: region || "",
  }
}

/**
 * خواندن پلاک از تصویر دوربین با OCR
 */
export async function ocrLicensePlate(
  video: HTMLVideoElement,
): Promise<Plate> {
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
    tessedit_pageseg_mode: "7", // تک خطی (برای خواندن خط اصلی پلاک)
    tessedit_char_whitelist:
      "۰۱۲۳۴۵۶۷۸۹0123456789الفبتثججزسسشصطعضقلقلمنهویBPTJDZSGNVMHL",
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

