import type { MotionProps } from "framer-motion"

type AmbientMotion = Pick<MotionProps, "animate" | "transition">

/**
 * Pure derivations of the `animate`/`transition` props for the decorative
 * layers of the calculator frame. They resolve the in-view / reduced-motion
 * branches outside the component body so it stays free of conditional motion
 * expressions. Values are identical to the inline expressions they replace.
 */

/** Radial glow halo behind the card. */
export function ambientGlowMotion(inView: boolean, reduced: boolean | null): AmbientMotion {
  return {
    animate: inView
      ? reduced
        ? { opacity: 0.26, scale: 1 }
        : { opacity: [0.18, 0.34, 0.18], scale: [0.98, 1.03, 0.98] }
      : { opacity: 0, scale: 0.9 },
    transition: reduced
      ? {}
      : { duration: 6.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  }
}

/** Slowly rotating conic ring around the card. */
export function ambientRingMotion(inView: boolean, reduced: boolean | null): AmbientMotion {
  return {
    animate: inView
      ? reduced
        ? { opacity: 0.3, rotate: 0 }
        : { opacity: [0.3, 0.64, 0.3], rotate: 360 }
      : { opacity: 0, rotate: 0 },
    transition: reduced
      ? {}
      : {
          opacity: { duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          rotate: { duration: 9.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
        },
  }
}

/** Faint grid overlay across the frame. */
export function ambientGridMotion(inView: boolean, reduced: boolean | null): AmbientMotion {
  return {
    animate: inView
      ? reduced
        ? { opacity: 0.7 }
        : { opacity: [0.56, 0.85, 0.56], backgroundPosition: ["0px 0px", "22px 11px", "0px 0px"] }
      : { opacity: 0 },
    transition: reduced
      ? {}
      : { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
  }
}

/** Blurred floor glow below the card. */
export function ambientFloorMotion(inView: boolean, reduced: boolean | null): AmbientMotion {
  return {
    animate: inView
      ? reduced
        ? { opacity: 0.29, scale: 1 }
        : { opacity: [0.2, 0.38, 0.2], scale: [0.96, 1.06, 0.96] }
      : { opacity: 0, scale: 0.92 },
    transition: reduced
      ? {}
      : { duration: 5.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  }
}

/** Conic gradient border inside the card. */
export function cardConicMotion(inView: boolean, reduced: boolean | null): AmbientMotion {
  return {
    animate: inView
      ? reduced
        ? { opacity: 0.4 }
        : { opacity: [0.25, 0.55, 0.25] }
      : { opacity: 0 },
    transition: reduced
      ? {}
      : { duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  }
}

/** Sweeping shine line inside the card. */
export function cardShineMotion(inView: boolean, reduced: boolean | null): AmbientMotion {
  return {
    animate: inView
      ? reduced
        ? { opacity: 0.5 }
        : { opacity: [0.15, 0.85, 0.15] }
      : { opacity: 0.2 },
    transition: reduced
      ? {}
      : { duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
  }
}
