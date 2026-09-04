"use client";

import { useEffect, useState } from "react";
import type { StockRow } from "./stock";

export function useStock() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      void fetch("/api/estoque", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload: { live?: boolean; items?: StockRow[] }) => {
          if (cancel) return;
          setLive(Boolean(payload.live));
          setRows(payload.items || []);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 45_000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  return { rows, live };
}
