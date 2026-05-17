"use client";

import { createContext, useContext } from "react";
import type { FAQData } from "@/types";

const FAQContext = createContext<FAQData | null>(null);

export function FAQProvider({ children, data }: { children: React.ReactNode; data: FAQData }) {
  return <FAQContext.Provider value={data}>{children}</FAQContext.Provider>;
}

export function useFAQData(): FAQData {
  const value = useContext(FAQContext);
  if (!value) throw new Error("useFAQData must be used within FAQProvider");
  return value;
}
