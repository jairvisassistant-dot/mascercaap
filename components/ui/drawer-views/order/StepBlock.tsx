"use client"

import React from "react"

export default function StepBlock({
  number, label, active, summary, onEdit, backLabel, children,
}: {
  number: number
  label: string
  active: boolean
  summary: string | null
  onEdit: () => void
  backLabel: string
  children: React.ReactNode
}) {
  if (!active && !summary) return null

  return (
    <div className={!active ? "pb-4 border-b border-border-soft" : ""}>
      <p className="text-sm font-semibold text-text-main mb-3">
        <span className="text-primary mr-2">{number}.</span>{label}
      </p>
      {active ? (
        children
      ) : (
        <p className="text-text-muted text-sm flex flex-wrap items-center gap-1">
          <span>{summary}</span>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center min-h-[36px] px-2 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            {backLabel}
          </button>
        </p>
      )}
    </div>
  )
}
