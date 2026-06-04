import type { Car } from "./types"

const hoursAgo = (h: number) => Date.now() - h * 60 * 60 * 1000

export const initialCars: Car[] = [
  {
    id: "car-1",
    plate: { twoDigits: "۱۲", letter: "ب", threeDigits: "۳۴۵", region: "۱۱" },
    brand: "پراید",
    model: "۱۳۱ SE",
    color: "سفید",
    year: "۱۳۹۸",
    ownerName: "رضا محمدی",
    ownerPhone: "۰۹۱۲۳۴۵۶۷۸۹",
    entryAt: hoursAgo(3),
    note: "صدای غیرعادی از موتور در دور بالا",
    services: [
      { id: "s1", title: "تعویض روغن و فیلتر", status: "done", price: 850000 },
      { id: "s2", title: "تنظیم موتور", status: "in-progress", price: 1200000 },
      { id: "s3", title: "بررسی سیستم تعلیق", status: "pending", price: 600000 },
    ],
    parts: [
      { id: "p1", name: "فیلتر روغن", quantity: 1, unitPrice: 180000 },
      { id: "p2", name: "روغن موتور (۴ لیتر)", quantity: 1, unitPrice: 620000 },
    ],
  },
  {
    id: "car-2",
    plate: { twoDigits: "۸۸", letter: "س", threeDigits: "۷۲۱", region: "۲۲" },
    brand: "پژو",
    model: "۲۰۶ تیپ ۵",
    color: "نقره‌ای",
    year: "۱۴۰۰",
    ownerName: "سارا کریمی",
    ownerPhone: "۰۹۳۵۱۱۱۲۲۳۳",
    entryAt: hoursAgo(1),
    note: "ترمزها ضعیف شده‌اند",
    services: [
      { id: "s4", title: "تعویض لنت ترمز جلو", status: "in-progress", price: 950000 },
      { id: "s5", title: "خونگیری ترمز", status: "pending", price: 400000 },
    ],
    parts: [{ id: "p3", name: "لنت ترمز جلو", quantity: 1, unitPrice: 1100000 }],
  },
  {
    id: "car-3",
    plate: { twoDigits: "۴۵", letter: "ل", threeDigits: "۹۰۲", region: "۶۶" },
    brand: "سمند",
    model: "LX",
    color: "مشکی",
    year: "۱۳۹۶",
    ownerName: "حسین احمدی",
    ownerPhone: "۰۹۱۹۸۸۷۷۶۶۵",
    entryAt: hoursAgo(6),
    services: [{ id: "s6", title: "تعویض دیسک و صفحه کلاچ", status: "pending", price: 2400000 }],
    parts: [],
  },
]
