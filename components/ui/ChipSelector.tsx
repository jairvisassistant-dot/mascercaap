"use client"

interface ChipOption<T> {
  value: T
  label: string
  sublabel?: string
}

interface ChipSelectorProps<T> {
  options: ChipOption<T>[]
  selected: T | null
  onChange: (value: T) => void
  className?: string
}

export default function ChipSelector<T extends string | number>({
  options,
  selected,
  onChange,
  className = "",
}: ChipSelectorProps<T>) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const isSelected = opt.value === selected
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "inline-flex flex-col items-center justify-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-150",
              "min-h-[44px] min-w-[44px] border",
              isSelected
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface-page text-text-main border-border-mid hover:border-primary/60 hover:bg-primary/6",
            ].join(" ")}
          >
            <span>{opt.label}</span>
            {opt.sublabel && (
              <span className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                {opt.sublabel}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
