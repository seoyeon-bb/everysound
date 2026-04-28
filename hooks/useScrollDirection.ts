"use client";

import { useEffect, useRef, useState } from "react";

const SHOW_AT_TOP = 40;
const MIN_DELTA = 5;

export function useScrollDirection(): boolean {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (y < SHOW_AT_TOP) {
        setVisible(true);
      } else if (Math.abs(dy) > MIN_DELTA) {
        setVisible(dy < 0);
      }
      lastY.current = y;
    }
    lastY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
