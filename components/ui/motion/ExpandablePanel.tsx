"use client";

import { m, AnimatePresence } from "framer-motion";

type Props = {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
};

/**
 * ExpandablePanel — animated expand/collapse container.
 *
 * Wraps AnimatePresence + m.div with height/opacity animation so content
 * slides open and closed smoothly. The overflow is hidden to clip content
 * during the height transition.
 *
 * Usage:
 * ```tsx
 * <ExpandablePanel isOpen={expanded}>
 *   <div>Content here</div>
 * </ExpandablePanel>
 * ```
 *
 * This pattern was extracted from ProductsFilterBar.tsx and PulpaFruitGrid.tsx
 * to be reusable across the project.
 */
export function ExpandablePanel({ isOpen, children, className }: Props) {
  const combinedClassName = className
    ? `overflow-hidden ${className}`
    : "overflow-hidden";

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className={combinedClassName}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
