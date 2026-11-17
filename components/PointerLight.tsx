"use client";

import { useEffect } from "react";

/**
 * Feeds the pointer position to the `lit` utility: one listener for the whole
 * page, writing CSS variables on the element under the mouse.
 */
export function PointerLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = (event.target as Element | null)?.closest?.(".lit");
        if (!(target instanceof HTMLElement)) return;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--lit-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--lit-y", `${event.clientY - rect.top}px`);
      });
    }
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}
