"use client";

import { useEffect, useMemo, useState } from "react";
import PainelBanners from "../shop/PainelBanners";
import { BANNERS_PAINEL, type BannerPainel } from "../shop/painel-banners";

const BANNERS_PRINCIPAIS = Array.from({ length: 14 }, (_, i) => ({
  id: `hero-${i + 1}`,
  nome: `Banner ${i + 1}`,
  descricao: "Carrossel principal",
}));

type Banner = { id: string; url: string };

export default function PainelPromocoes() {
  const [aviso, setAviso] = useState("");
  const [atuais, setAtuais] = useState<Banner[]>([]);

  useEffect(() => {
    fetch("/api/interno/banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { banners?: Banner[] }) => setAtuais(d.banners ?? []))
      .catch(() => {});
  }, []);

  // Prévia: o mesmo carrossel da home, com as artes enviadas (na ordem 1 a 14). Sem nenhuma arte, mostra os espaços em branco como o site.
  const previa = useMemo<BannerPainel[]>(() => {
    const ordem = (id: string) => Number(id.replace("hero-", "")) || 0;
    const lista = atuais.filter((a) => a.id.startsWith("hero-")).sort((a, b) => ordem(a.id) - ordem(b.id));
    return lista.length ? lista.map((a) => ({ id: a.id, imagem: a.url, alt: "Oferta da União Farma" })) : BANNERS_PAINEL;
  }, [atuais]);

  async function enviar(id: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setAviso("Enviando...");
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(arquivo);
    });
    const r = await fetch("/api/interno/banners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, url }),
    });
    if (r.ok) {
      setAviso("Arte enviada.");
      setAtuais((prev) => [...prev.filter((b) => b.id !== id), { id, url }]);
    } else {
      setAviso("Não consegui gravar. Tente de novo.");
    }
  }

  return (
    <section className="pm-pagina">
      <header className="pm-cabeca">
        <h1>Promoções</h1>
        <p>Banners do carrossel principal da página inicial. Toque no cartão para enviar ou trocar a arte.</p>
      </header>
      {aviso ? <p className="pm-aviso" role="status">{aviso}</p> : null}
      <section className="pm-previa" aria-label="Prévia da página inicial">
        <h2>Como vai ficar na página inicial</h2>
        <p>É o mesmo carrossel do site, com as artes enviadas abaixo. Troca sozinho a cada 5 segundos.</p>
        <PainelBanners fonte={previa} />
      </section>
      <h2 className="pm-secao">Artes dos banners</h2>
      <div className="pm-grade">
        {BANNERS_PRINCIPAIS.map((b) => {
          const atual = atuais.find((a) => a.id === b.id);
          return (
            <label key={b.id} className="pm-card">
              <input type="file" accept="image/*" onChange={(e) => { void enviar(b.id, e.target.files?.[0]); e.target.value = ""; }} aria-label={`${atual ? "Trocar" : "Enviar"} a arte do ${b.nome}`} />
              <div className="pm-arte">
                {atual ? (
                  <img src={atual.url} alt="" />
                ) : (
                  <span className="pm-vazio">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Enviar arte
                  </span>
                )}
              </div>
              <div className="pm-texto">
                <div>
                  <strong>{b.nome}</strong>
                  <span>{b.descricao}</span>
                </div>
                {atual ? <span className="pm-acao">Trocar</span> : null}
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
