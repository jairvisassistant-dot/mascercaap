"use client";

import { createContext, useContext, useState, useCallback } from "react";

type View = "menu" | "faq" | "privacy" | "terms" | "contact" | "order";

export type DrawerContext = {
  product?: string;
};

type HelpHubContextType = {
  isOpen: boolean;
  initialView: View;
  drawerContext: DrawerContext | null;
  openDrawer: (view?: View, context?: DrawerContext) => void;
  closeDrawer: () => void;
};

const HelpHubContext = createContext<HelpHubContextType | null>(null);

export function HelpHubProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialView, setInitialView] = useState<View>("faq");
  const [drawerContext, setDrawerContext] = useState<DrawerContext | null>(null);

  const openDrawer = useCallback((view: View = "faq", context?: DrawerContext) => {
    setInitialView(view);
    setDrawerContext(context ?? null);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <HelpHubContext.Provider value={{ isOpen, initialView, drawerContext, openDrawer, closeDrawer }}>
      {children}
    </HelpHubContext.Provider>
  );
}

export function useHelpHub(): HelpHubContextType {
  const ctx = useContext(HelpHubContext);
  if (!ctx) throw new Error("useHelpHub must be used within HelpHubProvider");
  return ctx;
}
