import type { Plate } from "@/lib/types"
import { PLATE_LETTERS } from "@/lib/types"
import { toFa } from "@/lib/format"
import { cn } from "@/lib/utils"

const sizeMap = {
  sm: { wrap: "h-9 text-sm", ir: "w-7 text-[8px]", gap: "gap-1 px-1.5", input: "w-7 h-full text-sm", select: "w-8 h-full text-sm" },
  md: { wrap: "h-12 text-lg", ir: "w-9 text-[10px]", gap: "gap-1.5 px-2", input: "w-9 h-full text-lg", select: "w-10 h-full text-lg" },
  lg: { wrap: "h-16 text-2xl", ir: "w-12 text-xs", gap: "gap-2 px-3", input: "w-12 h-full text-2xl", select: "w-14 h-full text-2xl" },
}

// ورودی‌های یکپارچه داخل پلاک
function PlateInput({
  value,
  onChange,
  maxLength,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  maxLength?: number
  placeholder?: string
  className?: string
}) {
  return (
    <input
      dir="ltr"
      inputMode="numeric"
      maxLength={maxLength}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      className={cn(
        "bg-transparent text-center font-mono tabular-nums outline-none placeholder:text-black/30",
        className,
      )}
    />
  )
}

function PlateSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <select
      dir="rtl"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "bg-transparent font-sans text-center outline-none cursor-pointer appearance-none",
        className,
      )}
    >
      {PLATE_LETTERS.map((l) => (
        <option key={l} value={l}>{l}</option>
      ))}
    </select>
  )
}

export function LicensePlate({
  plate,
  size = "md",
  className,
  editable = false,
  onPlateChange,
}: {
  plate: Plate
  size?: keyof typeof sizeMap
  className?: string
  editable?: boolean
  onPlateChange?: (plate: Plate) => void
}) {
  const s = sizeMap[size]

  const set = (key: keyof Plate, value: string) => {
    if (onPlateChange) {
      onPlateChange({ ...plate, [key]: value })
    }
  }

  return (
    <div
      dir="ltr"
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-md border-2 border-foreground/70 bg-[#f4d000] font-bold text-black shadow-sm",
        s.wrap,
        className,
      )}
    >
      {/* بخش آبی پرچم ایران */}
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-[#1a3a8f] text-white",
          s.ir,
        )}
      >
        <span className="leading-none">I.R.</span>
        <span className="leading-none">IRAN</span>
        <span className="mt-0.5 h-1.5 w-full bg-gradient-to-b from-[#19a463] via-white to-[#e4002b]" />
      </div>
      {/* اعداد و حرف */}
      <div className={cn("flex items-center font-mono tabular-nums", s.gap)}>
        {editable ? (
          <>
            <PlateInput value={plate.twoDigits} onChange={(v) => set("twoDigits", v)} maxLength={2} placeholder="۱۲" className={s.input} />
            <PlateSelect value={plate.letter} onChange={(v) => set("letter", v)} className={s.select} />
            <PlateInput value={plate.threeDigits} onChange={(v) => set("threeDigits", v)} maxLength={3} placeholder="۳۴۵" className={s.input} />
          </>
        ) : (
          <>
            <span>{toFa(plate.twoDigits)}</span>
            <span className="font-sans">{plate.letter}</span>
            <span>{toFa(plate.threeDigits)}</span>
          </>
        )}
      </div>
      {/* کد شهر */}
      <div className={cn("flex flex-col items-center justify-center border-r-2 border-black/30 font-mono", s.gap)}>
        <span className="leading-none text-[0.5em] font-sans font-normal">ایران</span>
        {editable ? (
          <PlateInput value={plate.region} onChange={(v) => set("region", v)} maxLength={2} placeholder="۱۱" className={s.input} />
        ) : (
          <span className="leading-none">{toFa(plate.region)}</span>
        )}
      </div>
    </div>
  )
}
