"use client";

import { m } from "framer-motion";
import EmojiIcon from "@/components/ui/EmojiIcon";

export function SealBadge({
  emoji,
  top,
  bottom,
  delay,
  index,
}: {
  emoji: string;
  top: string;
  bottom: string;
  delay: number;
  index: number;
}) {
  const uid = `seal-${index}`;

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.08, rotate: 3 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay, type: "spring", bounce: 0.45 }}
      style={{ cursor: "pointer" }}
    >
      <svg
        viewBox="0 0 200 200"
        width="160"
        height="160"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`${top} ${bottom}`}
      >
        <defs>
          <linearGradient id={`gold-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <filter id={`shadow-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.5)" />
          </filter>
          <path id={`top-${uid}`} d="M 42,100 A 58,58 0 0,1 158,100" />
          <path id={`bot-${uid}`} d="M 29,100 A 71,71 0 0,0 171,100" />
        </defs>

        {[0, 22.5, 45, 67.5].map((deg) => (
          <rect
            key={deg}
            x="10"
            y="10"
            width="180"
            height="180"
            rx="30"
            fill={`url(#gold-${uid})`}
            transform={`rotate(${deg} 100 100)`}
          />
        ))}

        <circle cx="100" cy="100" r="83" fill={`url(#gold-${uid})`} />

        <circle
          cx="100"
          cy="100"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        <circle cx="100" cy="100" r="43" fill="rgba(146, 64, 14, 0.18)" />

        <foreignObject x="76" y="76" width="48" height="48">
          <div className="flex h-full w-full items-center justify-center">
            <EmojiIcon emoji={emoji} label={`${top} ${bottom}`} size="xl" tone="plain" />
          </div>
        </foreignObject>

        <text
          fill="white"
          fontSize="14"
          fontFamily="Impact, 'Arial Black', Arial, sans-serif"
          letterSpacing="2"
          filter={`url(#shadow-${uid})`}
        >
          <textPath href={`#top-${uid}`} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>

        <text
          fill="white"
          fontSize="14"
          fontFamily="Impact, 'Arial Black', Arial, sans-serif"
          letterSpacing="2"
          filter={`url(#shadow-${uid})`}
        >
          <textPath href={`#bot-${uid}`} startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
      </svg>
    </m.div>
  );
}
