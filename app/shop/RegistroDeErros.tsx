"use client";

import { useEffect } from "react";

/**
 * Manda para o servidor os erros de JavaScript que acontecem no aparelho do cliente (no máximo 5 por página aberta, sem repetir),
 * para a equipe ver em /interno/erros. Não guarda cookie nem dado pessoal; a limpeza é feita no servidor (app/erros.ts).
 */
export default function RegistroDeErros() {
  useEffect(() => {
    const vistos = new Set<string>();
    let enviados = 0;
    const enviar = (msg: unknown, arq: unknown, lin: unknown) => {
      const texto = String(msg ?? "");
      const chave = `${texto}|${String(arq ?? "")}|${String(lin ?? "")}`;
      if (!texto || vistos.has(chave) || enviados >= 5) return;
      vistos.add(chave);
      enviados += 1;
      const corpo = JSON.stringify({ msg: texto, arq: arq ?? "", lin: lin ?? 0, pag: window.location.pathname });
      try {
        if (!(navigator.sendBeacon && navigator.sendBeacon("/api/erro-cliente", new Blob([corpo], { type: "application/json" })))) {
          void fetch("/api/erro-cliente", { method: "POST", headers: { "content-type": "application/json" }, body: corpo, keepalive: true }).catch(() => undefined);
        }
      } catch {
        // o registro nunca pode atrapalhar a página
      }
    };
    const aoErro = (e: ErrorEvent) => enviar(e.message, e.filename, e.lineno);
    const aoRejeitar = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      enviar(r instanceof Error ? r.message : r, r instanceof Error ? (r.stack ?? "").split("\n")[1] ?? "" : "", 0);
    };
    window.addEventListener("error", aoErro);
    window.addEventListener("unhandledrejection", aoRejeitar);
    return () => {
      window.removeEventListener("error", aoErro);
      window.removeEventListener("unhandledrejection", aoRejeitar);
    };
  }, []);
  return null;
}
