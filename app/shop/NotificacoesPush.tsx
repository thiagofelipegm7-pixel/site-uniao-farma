"use client";

import { useState, useEffect } from "react";

export default function NotificacoesPush() {
  const [suportado, setSuportado] = useState(false);
  const [permissao, setPermissao] = useState<NotificationPermission>("default");
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    setSuportado("Notification" in window && "serviceWorker" in navigator);
    if ("Notification" in window) setPermissao(Notification.permission);
  }, []);

  async function ativar() {
    if (!suportado) return;
    const perm = await Notification.requestPermission();
    setPermissao(perm);
    if (perm === "granted") {
      setAtivo(true);
      // Registra interesse (em produção: salvar endpoint do push)
      localStorage.setItem("uf_push_ativo", "1");
      new Notification("União Farma", { body: "Notificações ativadas! Avisaremos sobre seus pedidos.", icon: "/favicon.png" });
    }
  }

  if (!suportado) return null;

  return (
    <div style={{ padding: "1rem", background: "#f9fdfc", borderRadius: "10px", margin: "1rem" }}>
      <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.5rem" }}>Notificações</h2>
      <p style={{ fontSize: "0.9rem", color: "#3e4b49", margin: "0 0 0.75rem" }}>
        Receba avisos quando seu pedido estiver pronto ou um produto chegar.
      </p>
      {permissao === "granted" || ativo ? (
        <p style={{ color: "#0e7370", fontWeight: 600 }}>Notificações ativadas</p>
      ) : (
        <button
          type="button"
          onClick={ativar}
          style={{ background: "#0e7370", color: "#fff", border: 0, borderRadius: "999px", padding: "0.5rem 1rem", fontWeight: 700 }}
        >
          Ativar notificações
        </button>
      )}
    </div>
  );
}
