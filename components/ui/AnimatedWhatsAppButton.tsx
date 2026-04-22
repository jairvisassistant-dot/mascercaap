"use client";

import { useEffect, useRef } from "react";
import { m, useInView, useAnimation } from "framer-motion";
import Link from "next/link";

interface Props {
  href: string;
  label: string;
}

const EXPAND_MS   = 800;
const HOLD_MS     = 5000;
const COLLAPSE_MS = 650;
const PAUSE_MS    = 700;

export default function AnimatedWhatsAppButton({ href, label }: Props) {
  const ref        = useRef<HTMLDivElement>(null);
  const isInView   = useInView(ref, { amount: 0.6 });
  const widthCtrl  = useAnimation();
  const textCtrl   = useAnimation();

  useEffect(() => {
    let alive = true;

    const loop = async () => {
      widthCtrl.set({ width: 0 });
      textCtrl.set({ opacity: 0 });

      while (alive) {
        // Expand
        await Promise.all([
          widthCtrl.start({
            width: 240,
            transition: { duration: EXPAND_MS / 1000, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
          }),
          textCtrl.start({
            opacity: 1,
            transition: { duration: 0.38, delay: (EXPAND_MS / 1000) * 0.42, ease: "easeOut" },
          }),
        ]);

        // Hold
        await new Promise<void>(r => setTimeout(r, HOLD_MS));
        if (!alive) break;

        // Collapse
        await Promise.all([
          textCtrl.start({
            opacity: 0,
            transition: { duration: 0.28, ease: "easeIn" },
          }),
          widthCtrl.start({
            width: 0,
            transition: { duration: COLLAPSE_MS / 1000, delay: 0.18, ease: [0.7, 0, 0.84, 0] as [number,number,number,number] },
          }),
        ]);

        // Pause before next cycle
        await new Promise<void>(r => setTimeout(r, PAUSE_MS));
      }
    };

    if (isInView) loop();

    return () => {
      alive = false;
      widthCtrl.stop();
      textCtrl.stop();
    };
  }, [isInView, widthCtrl, textCtrl]);

  return (
    <div ref={ref} className="flex justify-center">
      <Link href={href} target="_blank" rel="noopener noreferrer">
        <div className="inline-flex items-center bg-accent hover:bg-accent-dark rounded-full h-14 shadow-lg shadow-black/20 overflow-hidden cursor-pointer transition-colors duration-200">
          {/* Ícono — siempre visible, anclado a la izquierda */}
          <div className="shrink-0 w-14 h-14 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>

          {/* Contenedor de texto — anima su ancho */}
          <m.div
            animate={widthCtrl}
            className="overflow-hidden"
            style={{ width: 0 }}
          >
            <m.span
              animate={textCtrl}
              className="block text-white font-bold text-base whitespace-nowrap pr-7"
              style={{ opacity: 0 }}
            >
              {label}
            </m.span>
          </m.div>
        </div>
      </Link>
    </div>
  );
}
