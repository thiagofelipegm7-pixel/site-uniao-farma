"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };

    const start = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(register, { timeout: 4000 });
        return;
      }
      window.setTimeout(register, 1800);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);

  return null;
}
