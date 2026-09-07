"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.update()));
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        /* ignore */
      }
    };

    const start = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          void register();
        }, { timeout: 2000 });
        return;
      }
      window.setTimeout(() => {
        void register();
      }, 400);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);

  return null;
}
