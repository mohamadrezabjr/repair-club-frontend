"use client"

import DatePicker from "react-multi-date-picker"
import persian from "react-date-object/calendars/persian"
import persian_fa from "react-date-object/locales/persian_fa"
import type DateObject from "react-date-object"
import { useMemo } from "react"

const INPUT_CLASS =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

/**
 * انتخابگر تاریخ شمسی — مقدار به‌صورت ISO میلادی ("YYYY-MM-DD") نگهداری می‌شود.
 * الگوی مشترک با صفحه‌ی جستجوی ویزیت‌ها.
 */
export function JalaliDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
}: {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
}) {
  // ساخت DateObject از مقدار ISO فعلی برای نمایش
  const dateValue = useMemo(() => (value ? new Date(value) : null), [value])

  return (
    <DatePicker
      calendar={persian}
      locale={persian_fa}
      calendarPosition="bottom-right"
      value={dateValue}
      onChange={(val) => {
        if (val) {
          const d = val as DateObject
          onChange(d.toDate().toISOString().split("T")[0])
        } else {
          onChange("")
        }
      }}
      format="YYYY/MM/DD"
      inputClass={INPUT_CLASS}
      containerClassName="w-full"
      placeholder={placeholder}
    />
  )
}
