"use client";

import { createContext, useContext, useMemo } from "react";
import { buildPriceResolver } from "@/lib/order-assistant";
import type { PriceEntry, PriceResolver } from "@/lib/order-assistant";

const PriceContext = createContext<PriceResolver>(() => null);

export function PriceProvider({
  prices,
  children,
}: {
  prices: PriceEntry[];
  children: React.ReactNode;
}) {
  const resolve = useMemo(() => buildPriceResolver(prices), [prices]);
  return <PriceContext.Provider value={resolve}>{children}</PriceContext.Provider>;
}

export function usePrices(): PriceResolver {
  return useContext(PriceContext);
}
