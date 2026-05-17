"use client"

import { m } from "framer-motion"

export function AnimatedCup({
  color,
  delay,
  index,
  cupWidth = 18,
  cupHeight = 26,
}: {
  color: string
  delay: number
  index: number
  cupWidth?: number
  cupHeight?: number
}) {
  const id = `cup-clip-${index}`
  return (
    <m.svg
      viewBox="0 0 18 26"
      width={cupWidth}
      height={cupHeight}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: "easeOut" }}
    >
      <defs>
        <clipPath id={id}>
          <polygon points="2,3 16,3 13,24 5,24" />
        </clipPath>
      </defs>
      <polygon points="2,3 16,3 13,24 5,24" fill="#f3f4f6" />
      <m.rect
        x="-1" y="0" width="20" height="25"
        fill={color}
        fillOpacity={0.8}
        clipPath={`url(#${id})`}
        initial={{ y: 25 }}
        animate={{ y: 2 }}
        transition={{ delay: delay + 0.12, duration: 0.55, ease: [0.32, 0, 0.67, 0] }}
      />
      <polygon points="2,3 16,3 13,24 5,24" fill="none" stroke="#d1d5db" strokeWidth="1" strokeLinejoin="round" />
    </m.svg>
  )
}
