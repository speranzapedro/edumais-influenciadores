"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, SplitText, Flip, CustomEase);
  CustomEase.create("mola", "M0,0 C0.18,0.9 0.32,1.18 0.52,1.06 0.68,0.97 0.82,1 1,1");
  CustomEase.create("saida", "M0,0 C0.22,1 0.36,1 1,1");
}

/** Breakpoints usados nos `gsap.matchMedia()` das seções. */
export const MIDIA = {
  movimento: "(prefers-reduced-motion: no-preference)",
  reduzido: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
} as const;

export { CustomEase, DrawSVGPlugin, Flip, gsap, MotionPathPlugin, ScrollTrigger, SplitText, useGSAP };
