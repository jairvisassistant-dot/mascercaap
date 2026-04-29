"use client";

import { m } from "framer-motion";
import type { Dictionary } from "@/lib/i18n";

const icons = [
  <svg key="natural" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="no-preservatives" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>,
  <svg key="local" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="fast" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
];

const accentColors = [
  "from-primary to-primary-dark",
  "from-accent to-accent-dark",
  "from-primary to-primary-dark",
  "from-accent to-accent-dark",
];

export default function WhyChooseUs({ dict }: { dict: Dictionary }) {
  const pillars = dict.home.whyChooseUs.pillars;

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <m.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-primary/40 rounded-full" />
              <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
                {dict.home.whyChooseUs.sectionLabel}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-balance">
              {dict.home.whyChooseUs.title}
            </h2>
            <p className="text-gray-500 max-w-[58ch] leading-relaxed">
              {dict.home.whyChooseUs.subtitle}
            </p>
          </m.div>

          <div className="border-y border-gray-200/80 divide-y divide-gray-200/80 bg-white/60">
            {pillars.map((pillar, index) => (
              <m.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="group grid gap-5 py-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${accentColors[index]} text-white shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                  {icons[index]}
                </div>
                <div className="max-w-[56ch]">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{pillar.description}</p>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
