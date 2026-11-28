import type { Metadata } from "next";
import { COMPANY } from "../company";
import { AVALIACOES_CESTA } from "../data/avaliacoes-google";
import MarcaUniao from "../shop/MarcaUniao";
import NotasGoogle from "../shop/NotasGoogle";
import { buildWhatsAppUrl, PUBLIC_UNITS, WHATSAPP_SLA } from "../site-config";
import { formatarCentavos, TAXA_ENTREGA_CENTAVOS } from "../reserva/reserva-store";

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes") ?? PUBLIC_UNITS[0];
const AVALIACOES_ENTREGA = AVALIACOES_CESTA.filter((a) => /entrega/i.test(a.texto));
const CTA_ROTULO = "Pedir no WhatsApp da loja (resposta em 5 min)";

const whatsappHref = buildWhatsAppUrl(
  nacoes,
  "Oi, União Farma Nações Unidas! Vim pelo anúncio e quero confirmar preço e disponibilidade.",
  { campaign: "ppc_lp", content: "pedir_agora" },
);

export const metadata: Metadata = {
  title: { absolute: "Peça na União Farma Nações Unidas | Sabará" },
  description:
    "Confirme preço e estoque no WhatsApp em até 5 minutos. Retire grátis na loja ou receba no seu bairro em Sabará.",
  robots: { index: false, follow: false },
};

/**
 * W-13 / W-12 / W-14 / W-15 / W-22 / W-23 / W-24 / W-32:
 * Landing page dedicada para tráfego pago — sem menu de fuga, um único objetivo e CTA coerente.
 * Respeita R-05/R-06/R-07 (sem promoção de medicamento sob prescrição) e WCAG 2.2 AAA (A-01..A-14).
 */
export default function PedirAgoraLandingPage() {
  return (
    <div className="lp-paga">
      <header className="lp-topo">
        <a href="/" aria-label="União Farma Drogaria e Perfumaria: página inicial">
          <MarcaUniao />
        </a>
      </header>

      <section className="lp-hero" aria-labelledby="lp-titulo">
        <p className="lp-etiqueta">União Farma · Nações Unidas, Sabará</p>
        <h1 id="lp-titulo">Peça sua farmácia sem fila e receba resposta em até 5 minutos</h1>
        <p className="lp-subtitulo">
          Você economiza tempo porque confirma preço e estoque no WhatsApp {WHATSAPP_SLA}, retira grátis já separado no
          balcão ou recebe em casa a partir de {formatarCentavos(TAXA_ENTREGA_CENTAVOS)} — sem pagar nada antes.
        </p>
        <a
          className="lp-cta"
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          data-track-event="whatsapp_click"
          data-track-unit={nacoes.id}
          data-track-source="lp_paga_topo"
        >
          {CTA_ROTULO}
        </a>
        <p className="lp-pos-clique">
          Ao tocar, abrimos o WhatsApp da loja Nações Unidas. Nada é cobrado aqui e você pode desistir antes de confirmar.
        </p>
      </section>

      <section className="lp-bloco" aria-labelledby="lp-beneficios-titulo">
        <h2 id="lp-beneficios-titulo">Por que pedir direto com a loja</h2>
        <ul className="lp-lista">
          <li>
            <strong>Sem fila nem viagem perdida</strong> porque confirmamos o estoque e deixamos tudo separado antes de você sair de casa.
          </li>
          <li>
            <strong>Sem surpresa na taxa de entrega</strong> porque informamos o valor exato do seu bairro logo no começo da conversa.
          </li>
          <li>
            <strong>Pagamento só na entrega ou no balcão</strong> porque você só paga quando recebe (Pix, dinheiro ou cartão).
          </li>
        </ul>
      </section>

      <section className="lp-bloco" aria-labelledby="lp-provas-titulo">
        <h2 id="lp-provas-titulo">Quem compra na União Farma recomenda no Google</h2>
        <ul className="lp-depoimentos">
          {AVALIACOES_ENTREGA.map((av) => (
            <li key={av.id}>
              <blockquote>“{av.texto}”</blockquote>
              <p>
                <strong>{av.nomeExibicao}</strong> · Loja {av.loja} ·{" "}
                <a
                  href={av.urlAvaliacoes}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Conferir avaliação de ${av.nomeExibicao} sobre a loja ${av.loja} no Google (abre em nova aba)`}
                >
                  Conferir no Google
                </a>
              </p>
            </li>
          ))}
        </ul>
        <NotasGoogle className="notas-google--lp" />
      </section>

      <section className="lp-bloco lp-fechamento" aria-labelledby="lp-push-titulo">
        <h2 id="lp-push-titulo">Chame agora e confirme seu pedido em minutos</h2>
        <p>
          Medicamento sob prescrição só é dispensado após avaliação do farmacêutico responsável ({COMPANY.pharmacist.name}{" "}
          ·{" "}
          <a
            href={COMPANY.pharmacist.lookupUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${COMPANY.pharmacist.crf} — consultar registro no CRF/MG (abre em nova aba)`}
          >
            {COMPANY.pharmacist.crf}
          </a>
          ). Controlados da Portaria 344/98 não são vendidos online.
        </p>
        <a
          className="lp-cta"
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          data-track-event="whatsapp_click"
          data-track-unit={nacoes.id}
          data-track-source="lp_paga_rodape"
        >
          {CTA_ROTULO}
        </a>
      </section>
    </div>
  );
}
