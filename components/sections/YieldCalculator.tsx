"use client"

import { useReducer, useEffect, useRef, useCallback } from "react"
import { m, useInView, useReducedMotion } from "framer-motion"
import { CUP_OPTIONS, type FruitKey, type Presentation, type PrepType } from "@/lib/yield-calculator"
import { useHelpHub } from "@/lib/help-hub-context"
import type { Dictionary } from "@/lib/i18n"
import { CalculatorInteractive, type CalcState, type CalcAction } from "./CalculatorInteractive"

const initialState: CalcState = {
  step: 1,
  selectedPrep: null,
  targetCups: null,
  showCustomInput: false,
  customCups: "",
  selectedFruit: null,
  selectedPresentation: null,
};

function reducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "selectPrep":
      return { ...state, selectedPrep: action.prep, step: state.targetCups !== null ? 2 : state.step };
    case "selectCups":
      return { ...state, targetCups: action.cups, showCustomInput: false, customCups: "", step: state.selectedPrep !== null ? 2 : state.step };
    case "showCustom":
      return { ...state, showCustomInput: true, targetCups: null };
    case "setCustomCups":
      return { ...state, customCups: action.value };
    case "confirmCustomCups":
      return { ...state, targetCups: action.cups, showCustomInput: false, step: state.selectedPrep !== null ? 2 : state.step };
    case "selectFruit":
      return { ...state, selectedFruit: action.fruit, step: 3 };
    case "selectPresentation":
      return { ...state, selectedPresentation: action.presentation, step: "result" };
    case "backToStep2":
      return { ...state, step: 2, selectedFruit: null, selectedPresentation: null };
    case "backToStep3":
      return { ...state, step: 3, selectedPresentation: null };
    case "backToStep1":
    case "reset":
      return { ...initialState };
    default:
      return state;
  }
}

const CUSTOM_VALUE = -1

export default function YieldCalculator({ dict }: { dict: Dictionary }) {
  const t = dict.yieldCalculator
  const { openDrawer } = useHelpHub()

  const PREP_OPTIONS: { value: PrepType; label: string }[] = [
    { value: "jugo",   label: t.prepJugo },
    { value: "frappe", label: t.prepFrappe },
  ]

  const [state, dispatch] = useReducer(reducer, initialState);

  const cardRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const visualInView = useInView(visualRef, { once: true, amount: 0.35 })
  const shouldReduce = useReducedMotion()

  const cupChipOptions = [
    ...CUP_OPTIONS.map((v) => ({ value: v, label: String(v) })),
    { value: CUSTOM_VALUE, label: t.customLabel },
  ]

  const scrollCard = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 50)
  }, [])

  useEffect(() => {
    const timerRef = scrollTimerRef
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function handleFruitSelect(value: FruitKey) {
    dispatch({ type: "selectFruit", fruit: value });
    scrollCard()
  }

  function handlePresentationSelect(value: Presentation) {
    dispatch({ type: "selectPresentation", presentation: value });
    scrollCard()
  }

  return (
    <section className="relative overflow-hidden border-y border-border-mid py-24 bg-[radial-gradient(circle_at_10%_18%,rgba(63,143,70,0.14)_0%,transparent_30%),radial-gradient(circle_at_92%_6%,rgba(229,138,34,0.12)_0%,transparent_28%),linear-gradient(180deg,#f8fbf7_0%,#f4f8f2_52%,#f9fbf8_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(51,83,56,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,83,56,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute left-0 top-14 h-px w-28 bg-primary/35" />

      <div className="relative max-w-6xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-10 bg-primary/45 rounded-full" />
              <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
                {t.sectionLabel}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-[-0.03em] text-text-main mb-4 text-balance">
              {t.title}
            </h2>
            <p className="max-w-[62ch] text-text-muted leading-relaxed text-pretty">{t.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-white/70 p-5 shadow-[0_22px_55px_-36px_rgba(43,92,49,0.48)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-3">{t.quickFlowLabel}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">1. {t.prepLabel}</span>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">2. {t.step2Label}</span>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">3. {t.step3Label}</span>
            </div>
          </div>
        </m.div>

        {/* Animated visual frame + interactive card */}
        <div ref={visualRef} className="group relative">
          {/* Ambient glow */}
          <m.div
            className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-[1.9rem] bg-[radial-gradient(circle_at_50%_50%,rgba(63,143,70,0.24)_0%,rgba(63,143,70,0.12)_34%,rgba(63,143,70,0.02)_64%,transparent_82%)] blur-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={visualInView ? (shouldReduce ? { opacity: 0.26, scale: 1 } : { opacity: [0.18, 0.34, 0.18], scale: [0.98, 1.03, 0.98] }) : { opacity: 0, scale: 0.9 }}
            transition={shouldReduce ? {} : { duration: 6.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
          <m.div
            className="pointer-events-none absolute -inset-1.5 rounded-[1.12rem]"
            initial={{ opacity: 0, rotate: 0 }}
            animate={
              visualInView
                ? (shouldReduce ? { opacity: 0.3, rotate: 0 } : { opacity: [0.3, 0.64, 0.3], rotate: 360 })
                : { opacity: 0, rotate: 0 }
            }
            transition={shouldReduce ? {} : {
              opacity: { duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
              rotate: { duration: 9.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            }}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(63,143,70,0) 0deg, rgba(63,143,70,0) 44deg, rgba(171,224,130,0.62) 70deg, rgba(227,255,207,0.95) 92deg, rgba(145,205,99,0.55) 112deg, rgba(63,143,70,0) 146deg, rgba(63,143,70,0) 360deg)",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              padding: "2.2px",
              filter: "drop-shadow(0 0 8px rgba(171,224,130,0.45)) drop-shadow(0 0 16px rgba(145,205,99,0.28))",
            }}
          />
          <m.div
            className="pointer-events-none absolute -inset-x-2 -inset-y-2 rounded-[1.6rem] opacity-85 [background-image:linear-gradient(to_right,rgba(63,143,70,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(63,143,70,0.12)_1px,transparent_1px)] [background-size:22px_22px]"
            initial={{ opacity: 0 }}
            animate={visualInView ? (shouldReduce ? { opacity: 0.7 } : { opacity: [0.56, 0.85, 0.56], backgroundPosition: ["0px 0px", "22px 11px", "0px 0px"] }) : { opacity: 0 }}
            transition={shouldReduce ? {} : { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <m.div
            className="pointer-events-none absolute -inset-x-8 -bottom-12 h-28 rounded-full bg-primary/30 blur-3xl"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={
              visualInView
                ? (shouldReduce ? { opacity: 0.29, scale: 1 } : { opacity: [0.2, 0.38, 0.2], scale: [0.96, 1.06, 0.96] })
                : { opacity: 0, scale: 0.92 }
            }
            transition={shouldReduce ? {} : { duration: 5.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />

          <m.div
            initial={{ opacity: 0, y: 12, scale: 0.992 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-primary/30" />
            <m.div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.2 }}
            >
              <m.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={visualInView ? (shouldReduce ? { opacity: 0.4 } : { opacity: [0.25, 0.55, 0.25] }) : { opacity: 0 }}
                transition={shouldReduce ? {} : { duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(63,143,70,0.0) 74deg, rgba(63,143,70,0.58) 110deg, rgba(255,255,255,0.7) 128deg, rgba(63,143,70,0.0) 170deg, transparent 360deg)",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1.5px",
                }}
              />
              <m.div
                className="absolute -left-1/4 top-0 h-full w-1/4 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.02)_15%,rgba(63,143,70,0.30)_50%,rgba(255,255,255,0.02)_85%,transparent_100%)]"
                initial={{ x: "-120%", opacity: 0 }}
                whileInView={{ x: "520%", opacity: [0, 1, 0] }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
              <m.div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c6f59f] to-transparent"
                initial={{ opacity: 0.2 }}
                animate={visualInView ? (shouldReduce ? { opacity: 0.5 } : { opacity: [0.15, 0.85, 0.15] }) : { opacity: 0.2 }}
                transition={shouldReduce ? {} : { duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            </m.div>

            <CalculatorInteractive
              cardRef={cardRef}
              state={state}
              dispatch={dispatch}
              prepOptions={PREP_OPTIONS}
              cupChipOptions={cupChipOptions}
              t={t}
              onFruitSelect={handleFruitSelect}
              onPresentationSelect={handlePresentationSelect}
              onOrder={() => openDrawer("order")}
            />
          </m.div>
        </div>
      </div>
    </section>
  )
}
