"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import CountdownTimer from "@/components/ui/CountdownTimer";

export default function DailyOffer() {
  // useMemo evita recalcular la fecha en cada re-render del componente
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  return (
    <section className="py-16 bg-gradient-to-r from-primary to-primary-dark">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-white"
        >
          <span className="inline-block bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🔥 OFERTA DEL DÍA
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Jugo de Naranja 500ml
          </h2>
          <p className="text-xl mb-6 opacity-90">
            Solo hoy: <span className="line-through opacity-70 mr-2">$6.000</span>
            <span className="font-bold text-accent">$4.500</span>
          </p>

          {/* Countdown Timer */}
          <div className="mb-8">
            <p className="text-sm mb-4 opacity-80">Termina en:</p>
            <CountdownTimer targetDate={tomorrow} />
          </div>

          <Link
            href="/productos"
            className="inline-block bg-white text-primary font-bold py-3 px-8 rounded-full hover:bg-gray-100 transition-all hover:scale-105"
          >
            Aprovechar oferta
          </Link>
        </motion.div>
      </div>
    </section>
  );
}