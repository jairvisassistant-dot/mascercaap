"use client";

import { m, AnimatePresence } from "framer-motion";

interface ToastProps {
  show: boolean;
  type: "success" | "error";
  title: string;
  message: string;
}

export default function Toast({ show, type, title, message }: ToastProps) {
  const isSuccess = type === "success";

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed top-24 right-4 z-[9999] w-full max-w-sm"
          role="alert"
          aria-live="polite"
        >
          <div className={`rounded-2xl shadow-xl border bg-white flex gap-3 p-4 items-start ${
            isSuccess ? "border-primary/20 shadow-primary/10" : "border-red-200 shadow-red-500/10"
          }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isSuccess ? "bg-primary/10" : "bg-red-50"
            }`}>
              {isSuccess ? (
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${isSuccess ? "text-gray-800" : "text-red-800"}`}>
                {title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
