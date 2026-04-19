"use client";

import { m } from "framer-motion";
import type { Dictionary } from "@/lib/i18n";

const icons = [
  <svg key="natural" className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="no-preservatives" className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>,
  <svg key="local" className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>,
  <svg key="fast" className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
];

export default function WhyChooseUs({ dict }: { dict: Dictionary }) {
  const pillars = dict.home.whyChooseUs.pillars;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {dict.home.whyChooseUs.title}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {dict.home.whyChooseUs.subtitle}
          </p>
        </m.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, index) => (
            <m.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full text-primary mb-4">
                {icons[index]}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{pillar.title}</h3>
              <p className="text-gray-600">{pillar.description}</p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
