const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function toEn(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
}

export function formatToman(value: number): string {
  const safeValue = value ?? 0;
  return toFa(safeValue.toLocaleString("en-US")) + " تومان"
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "همین الان"
  if (minutes < 60) return `${toFa(minutes)} دقیقه پیش`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${toFa(hours)} ساعت پیش`
  const days = Math.floor(hours / 24)
  return `${toFa(days)} روز پیش`
}

// ---- برچسب‌های فارسی وضعیت‌ها ----
import type { VisitStatus, ServiceOrderStatus, TransmissionType } from "./types"

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  queued: "در نوبت",
  repairing: "در حال تعمیر",
  ready: "آماده تحویل",
  delivered: "تحویل داده شده",
  cancelled: "لغو شده",
}

export const SERVICE_ORDER_STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  pending: "در انتظار",
  "in-progress": "در حال انجام",
  done: "انجام شد",
}

export const TRANSMISSION_TYPE_LABEL: Record<TransmissionType, string> = {
  man: "دنده‌ای",
  auto: "اتوماتیک",
}

// ---- برچسب‌های بخش حسابداری ----
import type {
  ChequeDirection,
  ChequeStatus,
  PaymentMethod,
  TransactionKind,
} from "./types"

export const TRANSACTION_KIND_LABEL: Record<TransactionKind, string> = {
  income: "درآمد",
  expense: "هزینه",
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "نقدی",
  card: "کارت",
  transfer: "انتقال بانکی",
  cheque: "چک",
}

export const CHEQUE_DIRECTION_LABEL: Record<ChequeDirection, string> = {
  received: "دریافتی",
  issued: "پرداختی",
}

export const CHEQUE_STATUS_LABEL: Record<ChequeStatus, string> = {
  pending: "در جریان",
  cleared: "پاس شده",
  bounced: "برگشت خورده",
  cancelled: "باطل شده",
}

/** مبلغ فشرده به میلیون/هزار تومان — برای کارت‌های خلاصه */
export function formatTomanShort(value: number): string {
  const v = value ?? 0
  if (Math.abs(v) >= 1_000_000) {
    return toFa((v / 1_000_000).toFixed(1).replace(/\.0$/, "")) + " م.ت"
  }
  if (Math.abs(v) >= 1_000) {
    return toFa(Math.round(v / 1_000).toString()) + " هزار ت"
  }
  return toFa(v.toString()) + " ت"
}
