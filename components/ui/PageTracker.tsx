"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

export default function PageTracker() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (pathname !== previous.current) {
      previous.current = pathname;
      track("page_view");
    }
  }, [pathname]);

  return null;
}
