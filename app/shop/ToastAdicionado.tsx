"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; texto: string };

let mostrar: ((texto: string) => void) | null = null;

export function mostrarToast(texto: string) {
  mostrar?.(texto);
}

export default function ToastAdicionado() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    mostrar = (texto) => {
      const id = Date.now();
      setToasts((t) => [...t, { id, texto }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    };
    return () => { mostrar = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .toast-adicionado { animation: none !important; }
        }
      `}</style>
      <div
        className="toast-adicionado"
        style={{
          position: "fixed",
          bottom: "5.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          pointerEvents: "none",
        }}
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: "#0e7370",
              color: "#fff",
              padding: "0.75rem 1.25rem",
              borderRadius: "999px",
              fontSize: "0.9rem",
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              pointerEvents: "auto",
              animation: "toast-in 0.28s ease",
            }}
          >
            <span>{t.texto}</span>
            <a
              href="/nacoes-unidas/produtos"
              style={{ color: "#fff", textDecoration: "underline", fontWeight: 700, fontSize: "0.85rem" }}
            >
              Continuar
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
