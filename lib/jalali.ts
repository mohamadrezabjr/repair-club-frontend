/**
 * تبدیل تاریخ شمسی (جلالی) به میلادی (ISO)
 * فرمت ورودی: "۱۴۰۳/۰۱/۰۱" یا "1403/1/1"
 * فرمت خروجی: "2024-03-21"
 */
export function jalaliToIso(jalaliStr: string): string {
  const cleaned = jalaliStr.replace(/[۰-۹]/g, (d) =>
    "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString()
  )
  const parts = cleaned.split("/")
  if (parts.length !== 3) return ""

  const jy = parseInt(parts[0])
  const jm = parseInt(parts[1])
  const jd = parseInt(parts[2])

  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return ""

  const gregorian = jalaliToGregorian(jy, jm, jd)
  if (!gregorian) return ""

  const y = gregorian.getFullYear()
  const m = String(gregorian.getMonth() + 1).padStart(2, "0")
  const d = String(gregorian.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * تبدیل تاریخ میلادی به شمسی (جلالی) برای نمایش
 * فرمت خروجی: "۱۴۰۳/۰۱/۰۱"
 */
export function isoToJalali(isoStr: string): string {
  const date = new Date(isoStr)
  if (isNaN(date.getTime())) return isoStr

  const [jy, jm, jd] = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )

  return `${toFaDigits(jy)}/${toFaDigits(String(jm).padStart(2, "0"))}/${toFaDigits(String(jd).padStart(2, "0"))}`
}

export function formatJalaliDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── توابع تبدیل شمسی به میلادی ──────────────────────────────────

function jalaliToGregorian(jy: number, jm: number, jd: number): Date | null {
  if (jy < 1000 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null

  const base = jy - 1
  let totalDays = (base * 365) + Math.floor(base / 4) - Math.floor(base / 100) + Math.floor(base / 400)
  totalDays -= 226894 // difference between 1 Farvardin 1 and 1 January 1
  totalDays += dayOfYearJalali(jy, jm, jd)

  // Convert to Gregorian
  let gYear = 1
  let remaining = totalDays

  while (true) {
    const daysInYear = isLeapGregorian(gYear) ? 366 : 365
    if (remaining <= daysInYear) break
    remaining -= daysInYear
    gYear++
  }

  const gDate = new Date(gYear, 0, 1)
  gDate.setDate(gDate.getDate() + remaining - 1)
  return gDate
}

function dayOfYearJalali(year: number, month: number, day: number): number {
  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
  // Last month has 30 in leap years, 29 otherwise
  if (isLeapJalali(year)) {
    monthDays[11] = 30
  }
  let sum = 0
  for (let i = 0; i < month - 1; i++) {
    sum += monthDays[i]
  }
  return sum + day
}

function isLeapJalali(year: number): boolean {
  const y = year - 1
  return (y % 4 === 3) && (y % 100 !== 99) || (y % 400 === 399)
}

function isLeapGregorian(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

// ─── توابع تبدیل میلادی به شمسی ──────────────────────────────────

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gDate = new Date(gy, gm - 1, gd)
  const gTime = gDate.getTime()
  const startDate = new Date(622, 2, 21) // 1 Farvardin 1
  const diffDays = Math.floor((gTime - startDate.getTime()) / 86400000)

  let jy = 1
  let remaining = diffDays

  while (true) {
    const daysInYear = isLeapJalali(jy) ? 366 : 365
    if (remaining < daysInYear) break
    remaining -= daysInYear
    jy++
  }

  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
  if (isLeapJalali(jy)) monthDays[11] = 30

  let jm = 1
  for (let i = 0; i < 12; i++) {
    if (remaining < monthDays[i]) {
      jm = i + 1
      break
    }
    remaining -= monthDays[i]
  }

  return [jy, jm, remaining + 1]
}

function toFaDigits(input: number): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹"
  return String(input).replace(/[0-9]/g, (d) => fa[parseInt(d)])
}

// ─── ابزار ماه شمسی (برای بخش حسابداری) ──────────────────────────────────
// محاسبه‌ی بازه‌ی میلادی با react-date-object انجام می‌شود (همان کتابخانه‌ی
// تقویمِ date-picker پروژه) تا تبدیل شمسی↔میلادی دقیق و قابل‌اعتماد باشد.

import DateObject from "react-date-object"
import persian from "react-date-object/calendars/persian"
import gregorian from "react-date-object/calendars/gregorian"

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
]

/** سال و ماه شمسی جاری */
export function currentJalaliYearMonth(): { jy: number; jm: number } {
  const d = new DateObject({ calendar: persian })
  return { jy: d.year, jm: d.month.number }
}

function toIso(d: DateObject): string {
  const g = d.convert(gregorian)
  const y = g.year
  const m = String(g.month.number).padStart(2, "0")
  const day = String(g.day).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * بازه‌ی میلادی (ISO) متناظر با یک ماه شمسی — روز اول و آخر ماه.
 * خروجی برای ارسال به بک‌اند به‌عنوان date_from / date_to.
 */
export function jalaliMonthRangeIso(
  jy: number,
  jm: number
): { from: string; to: string } {
  const start = new DateObject({ calendar: persian, year: jy, month: jm, day: 1 })
  const end = new DateObject({
    calendar: persian,
    year: jy,
    month: jm,
    day: start.month.length,
  })
  return { from: toIso(start), to: toIso(end) }
}

/** برچسب فارسی «تیر ۱۴۰۳» */
export function jalaliMonthLabel(jy: number, jm: number): string {
  return `${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`
}
