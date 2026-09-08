"use client";

import { useEffect } from "react";

const CACHE_BUST = "uf-static-v24";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        if (window.localStorage.getItem("uf-cache-bust") !== CACHE_BUST) {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }
          window.localStorage.setItem("uf-cache-bust", CACHE_BUST);
        }

        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.update()));
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        /* ignore */
      }
    };

    const start = () => {
      if (typeof window.requestIdleCallback === "function") {
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
