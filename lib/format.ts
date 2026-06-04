const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function toEn(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
}

export function formatToman(value: number): string {
  return toFa(value.toLocaleString("en-US")) + " تومان"
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
