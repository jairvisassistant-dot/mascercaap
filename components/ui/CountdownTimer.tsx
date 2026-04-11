"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownTimerProps {
  targetDate: Date;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const difference = targetDate.getTime() - new Date().getTime();

  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

function FlipCard({ value, label }: { value: number; label: string }) {
  const displayValue = value.toString().padStart(2, "0");

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white rounded-lg shadow-lg w-16 h-20 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={displayValue}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold text-primary"
          >
            {displayValue}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-xs text-white/80 mt-2">{label}</span>
    </div>
  );
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeLeft(targetDate));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Skeleton durante hydration — evita el flash de 00:00:00 (UX-03)
  if (!mounted) {
    return (
      <div className="flex gap-4 justify-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="bg-white/20 rounded-lg w-16 h-20 animate-pulse" />
            <div className="bg-white/20 rounded h-3 w-12 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 justify-center">
      <FlipCard value={timeLeft.hours} label="Horas" />
      <span className="text-3xl font-bold text-white self-start mt-4">:</span>
      <FlipCard value={timeLeft.minutes} label="Minutos" />
      <span className="text-3xl font-bold text-white self-start mt-4">:</span>
      <FlipCard value={timeLeft.seconds} label="Segundos" />
    </div>
  );
}
