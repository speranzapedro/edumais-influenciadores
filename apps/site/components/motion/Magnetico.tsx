"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

/** Puxa o filho na direção do cursor (efeito magnético), com retorno elástico. */
export function Magnetico({ children, forca = 0.35, className = "" }: { children: React.ReactNode; forca?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current!;
      if (!window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
      const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      const mover = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * forca);
        y((e.clientY - (r.top + r.height / 2)) * forca);
      };
      const soltar = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" });
      };
      el.addEventListener("pointermove", mover);
      el.addEventListener("pointerleave", soltar);
      return () => {
        el.removeEventListener("pointermove", mover);
        el.removeEventListener("pointerleave", soltar);
      };
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={`inline-flex ${className}`}>
      {children}
    </span>
  );
}
