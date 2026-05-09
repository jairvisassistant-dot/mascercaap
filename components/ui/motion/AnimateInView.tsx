"use client";

import { m } from "framer-motion";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

const variants = {
  up:    { hidden: { opacity: 0, y: 24 },  visible: { opacity: 1, y: 0 } },
  left:  { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 30 },  visible: { opacity: 1, x: 0 } },
};

export function AnimateInView({ children, className, delay = 0, direction = "up" }: Props) {
  const { hidden, visible } = variants[direction];
  return (
    <m.div
      initial={hidden}
      whileInView={visible}
      viewport={{ once: true }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </m.div>
  );
}
