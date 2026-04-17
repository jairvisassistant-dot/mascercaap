"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";

const misionVisionConfig = {
  mision: {
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" />
        <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="5" fill="currentColor" />
      </svg>
    ),
    bgFrom: "#4CAF50",
    bgTo: "#2E7D32",
    accentColor: "#A5D6A7",
  },
  vision: {
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
        <path d="M4 32C4 32 14 12 32 12C50 12 60 32 60 32C60 32 50 52 32 52C14 52 4 32 4 32Z" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="9" stroke="currentColor" strokeWidth="3" />
        <circle cx="32" cy="32" r="3" fill="currentColor" />
      </svg>
    ),
    bgFrom: "#FF9800",
    bgTo: "#E65100",
    accentColor: "#FFCC80",
  },
};

export default function MisionVisionTabs() {
  const { dict } = useDictionary();
  const [activeTab, setActiveTab] = useState<"mision" | "vision">("mision");
  const config = misionVisionConfig[activeTab];
  const mv = dict.about.missionVision;
  const activeText = activeTab === "mision" ? mv.mission : mv.vision;

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block text-sm font-semibold tracking-widest text-primary uppercase mb-3">
            {mv.sectionSubtitle}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
            {mv.sectionTitle}
          </h2>
        </motion.div>

        {/* Tab Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-inner">
            {(["mision", "vision"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const cfg = misionVisionConfig[tab];
              const label = tab === "mision" ? mv.mission.label : mv.vision.label;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                    isActive ? "text-white shadow-md" : "text-gray-500 hover:text-gray-700"
                  }`}
                  style={isActive ? { background: `linear-gradient(135deg, ${cfg.bgFrom}, ${cfg.bgTo})` } : {}}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Animated Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="relative rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${config.bgFrom}, ${config.bgTo})` }}
          >
            <div
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 blur-3xl"
              style={{ background: config.accentColor }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-20 blur-3xl"
              style={{ background: config.accentColor }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 p-10 md:p-14">
              <div
                className="shrink-0 w-28 h-28 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
              >
                {config.icon}
              </div>
              <div className="text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">{activeText.title}</h3>
                <p className="text-white/85 text-lg leading-relaxed max-w-2xl text-justify">
                  {activeText.text}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
