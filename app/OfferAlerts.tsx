"use client";

import { useEffect, useState } from "react";

const STORAGE_ON = "uf-promo-alerts";
const STORAGE_STAMP = "uf-promo-stamp";

type OffersFeed = {
  stamp: string;
  count: number;
  offers: Array<{ id: string; name: string }>;
};

async function readFeed(): Promise<OffersFeed | null> {
  try {
    const response = await fetch("/api/ofertas", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as OffersFeed;
  } catch {
    return null;
  }
}

async function showOfferNotice(title: string, body: string) {
  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (registration?.showNotification) {
    await registration.showNotification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: "uf-ofertas",
      data: { url: "/ofertas" },
    });
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.png" });
  }
}

export default function OfferAlerts({ showButton = false }: { showButton?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const on = window.localStorage.getItem(STORAGE_ON) === "on";
    setEnabled(on && "Notification" in window && Notification.permission === "granted");
    if (!on || !("Notification" in window) || Notification.permission !== "granted") return;

    void (async () => {
      const feed = await readFeed();
      if (!feed) return;
      const previous = window.localStorage.getItem(STORAGE_STAMP);
      if (previous && previous !== feed.stamp && feed.count > 0) {
        const first = feed.offers[0]?.name;
        await showOfferNotice(
          "Nova oferta na União Farma",
          first ? `${first} e outras promoções da semana.` : "Tem promoção nova nas lojas de Sabará.",
        );
      }
      window.localStorage.setItem(STORAGE_STAMP, feed.stamp);
    })();
  }, []);

  async function toggle() {
    if (!("Notification" in window)) {
      setNote("Este aparelho não mostra aviso de oferta.");
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        window.localStorage.setItem(STORAGE_ON, "off");
        setEnabled(false);
        setNote("Aviso desligado.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNote("Permita o aviso nas configurações do telemóvel.");
        return;
      }
      const feed = await readFeed();
      if (feed) window.localStorage.setItem(STORAGE_STAMP, feed.stamp);
      window.localStorage.setItem(STORAGE_ON, "on");
      setEnabled(true);
      await showOfferNotice("Avisos ligados", "Quando entrar oferta nova, o telemóvel avisa.");
      setNote("Pronto. O telemóvel avisa oferta nova.");
    } finally {
      setBusy(false);
    }
  }

  if (!showButton) return null;

  return (
    <div className="offer-alerts">
      <button type="button" className="offer-alerts-button" onClick={() => void toggle()} disabled={busy}>
        {enabled ? "Parar avisos de oferta" : "Avisar novas ofertas"}
      </button>
      {note ? <p className="offer-alerts-note">{note}</p> : null}
    </div>
  );
}
