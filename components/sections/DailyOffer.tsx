"use client";

import { motion } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

const emojis = ["🤝", "🌿", "🏆", "🚚"];

function SealBadge({
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
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, delay, type: "spring", bounce: 0.45 }}
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

        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="40"
        >
          {emoji}
        </text>

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
    </motion.div>
  );
}

export default function DailyOffer() {
  const { dict } = useDictionary();
  const badges = dict.home.dailyOffer.badges;

  return (
    <section className="py-16 bg-gradient-to-r from-primary to-primary-dark">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {dict.home.dailyOffer.title}
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            {dict.home.dailyOffer.subtitle}
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {badges.map((badge, index) => (
            <SealBadge
              key={index}
              emoji={emojis[index]}
              top={badge.top}
              bottom={badge.bottom}
              delay={index * 0.12}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
