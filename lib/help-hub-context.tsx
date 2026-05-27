"use client";

import { createContext, use, useState, useCallback, useMemo } from "react";

type View = "menu" | "faq" | "privacy" | "terms" | "contact" | "whatsapp" | "order";

type DrawerContext = {
  product?: string;
};

type OpenDrawerOptions = {
  restoreSession?: boolean;
};

type HelpHubContextType = {
  isOpen: boolean;
  initialView: View;
  shouldRestoreSession: boolean;
  drawerContext: DrawerContext | null;
  openDrawer: (view?: View, context?: DrawerContext, options?: OpenDrawerOptions) => void;
  closeDrawer: () => void;
};

const HelpHubContext = createContext<HelpHubContextType | null>(null);

export function HelpHubProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialView, setInitialView] = useState<View>("faq");
  const [shouldRestoreSession, setShouldRestoreSession] = useState(false);
  const [drawerContext, setDrawerContext] = useState<DrawerContext | null>(null);

  const openDrawer = useCallback((view: View = "faq", context?: DrawerContext, options?: OpenDrawerOptions) => {
    setInitialView(view);
    setShouldRestoreSession(options?.restoreSession ?? false);
    setDrawerContext(context ?? null);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ctxValue = useMemo(
    () => ({ isOpen, initialView, shouldRestoreSession, drawerContext, openDrawer, closeDrawer }),
    [isOpen, initialView, shouldRestoreSession, drawerContext, openDrawer, closeDrawer]
  );

  return (
    <HelpHubContext.Provider value={ctxValue}>
      {children}
    </HelpHubContext.Provider>
  );
}

export function useHelpHub(): HelpHubContextType {
  const ctx = use(HelpHubContext);
  if (!ctx) throw new Error("useHelpHub must be used within HelpHubProvider");
  return ctx;
}
