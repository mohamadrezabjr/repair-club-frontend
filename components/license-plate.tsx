import type { Plate } from "@/lib/types"
import { toFa } from "@/lib/format"
import { cn } from "@/lib/utils"

const sizeMap = {
  sm: { wrap: "h-9 text-sm", ir: "w-7 text-[8px]", gap: "gap-1 px-1.5" },
  md: { wrap: "h-12 text-lg", ir: "w-9 text-[10px]", gap: "gap-1.5 px-2" },
  lg: { wrap: "h-16 text-2xl", ir: "w-12 text-xs", gap: "gap-2 px-3" },
}

export function LicensePlate({
  plate,
  size = "md",
  className,
}: {
  plate: Plate
  size?: keyof typeof sizeMap
  className?: string
}) {
  const s = sizeMap[size]
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
        <span>{toFa(plate.twoDigits)}</span>
        <span className="font-sans">{plate.letter}</span>
        <span>{toFa(plate.threeDigits)}</span>
      </div>
      {/* کد شهر */}
      <div className={cn("flex flex-col items-center justify-center border-r-2 border-black/30 font-mono", s.gap)}>
        <span className="leading-none">{toFa(plate.region)}</span>
      </div>
    </div>
  )
}
