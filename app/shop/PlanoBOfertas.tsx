/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos evitam falha de navegação cliente no Vinext. */
import { OFFERS_GROUP_URL } from "../site-config";

/**
 * C-23 (Lei do Funil Amplo e Plano B): quem não vai comprar hoje continua conectado à farmácia
 * sem atrito e sem coleta forçada de dados (L-4, R-11). Só ofertas de higiene, beleza e cuidado diário (R-06, L-3).
 */
export default function PlanoBOfertas() {
  return (
    <section className="plano-b" aria-labelledby="plano-b-titulo">
      <div className="plano-b-texto">
        <h2 id="plano-b-titulo">Ainda não vai comprar hoje?</h2>
        <p>
          Entre no Grupo de Ofertas da União Farma no WhatsApp para receber as promoções da semana de higiene,
          perfumaria e cuidado diário — você entra grátis, não precisa passar nenhum dado aqui e sai quando quiser.
        </p>
      </div>
      <div className="plano-b-acoes">
        <a
          className="plano-b-cta"
          href={OFFERS_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-track-event="offers_group_click"
          data-track-source="plano_b"
          aria-label="Receber ofertas da semana no grupo do WhatsApp (abre em nova aba)"
        >
          Receber ofertas da semana no WhatsApp
        </a>
        <a className="plano-b-secundario" href="/listas">
          Ver minha lista salva
        </a>
      </div>
    </section>
  );
}
