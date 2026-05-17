"use client"

import { useEffect } from "react"
import { m, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion"

export function AnimatedNumber({ target, className }: { target: number; className?: string }) {
  const shouldReduce = useReducedMotion()
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    if (shouldReduce) {
      mv.set(target)
      return
    }
    const controls = animate(mv, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [mv, target, shouldReduce])

  return <m.span className={className}>{display}</m.span>
}

export function AnimatedFloat({ target, className }: { target: number; className?: string }) {
  const shouldReduce = useReducedMotion()
  const mv = useMotionValue(0)
  const display = useTransform(mv, (v) => v.toFixed(1))

  useEffect(() => {
    if (shouldReduce) {
      mv.set(target)
      return
    }
    const controls = animate(mv, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [mv, target, shouldReduce])

  return <m.span className={className}>{display}</m.span>
}
