"use client";

import { useEffect, useMemo, useState } from "react";
import PainelBanners from "../shop/PainelBanners";
import type { BannerPainel } from "../shop/painel-banners";

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

  // Prévia editável: o mesmo carrossel da home, com as 14 vagas na ordem. Tocar numa vaga envia ou troca a arte dela.
  // (No site só aparecem as vagas que têm arte; as vazias ficam de fora.)
  const previa = useMemo<BannerPainel[]>(
    () =>
      BANNERS_PRINCIPAIS.map((b) => {
        const atual = atuais.find((a) => a.id === b.id);
        return atual ? { id: b.id, imagem: atual.url, alt: "Oferta da União Farma" } : { id: b.id, alt: `${b.nome} (sem arte)` };
      }),
    [atuais],
  );

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
        <p>É o carrossel da página inicial, do jeito que o cliente vê. Toque num banner para enviar ou trocar a arte dele e use as setas para ver os {BANNERS_PRINCIPAIS.length}. No site só aparecem os banners que têm arte.</p>
      </header>
      {aviso ? <p className="pm-aviso" role="status">{aviso}</p> : null}
      <section className="pm-previa" aria-label="Carrossel da página inicial">
        <PainelBanners fonte={previa} aoEnviar={(b, arquivo) => void enviar(b.id, arquivo)} />
      </section>
    </section>
  );
}
