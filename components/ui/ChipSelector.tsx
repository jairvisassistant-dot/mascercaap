"use client"

import { m, AnimatePresence } from "framer-motion"

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
          <m.button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.93 }}
            whileHover={!isSelected ? { scale: 1.04 } : {}}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className={[
              "relative overflow-hidden inline-flex flex-col items-center justify-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150",
              "min-h-[44px] min-w-[44px] border",
              isSelected
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface-page text-text-main border-border-mid hover:border-primary/60 hover:bg-primary/6",
            ].join(" ")}
          >
            {/* Shimmer burst al seleccionar */}
            <AnimatePresence>
              {isSelected && (
                <m.span
                  key="shimmer"
                  className="absolute inset-0 rounded-full bg-white/25 pointer-events-none"
                  initial={{ opacity: 0.7, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 2.2 }}
                  exit={{}}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <span className="relative">{opt.label}</span>
            {opt.sublabel && (
              <span className={`relative text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                {opt.sublabel}
              </span>
            )}
          </m.button>
        )
      })}
    </div>
  )
}
