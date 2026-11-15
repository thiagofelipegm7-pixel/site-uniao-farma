import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";
import "./cartao-busca.css";

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes");

/**
 * Cartão de busca da home: caixa de busca sobre um painel, a linha "Você também pode pedir por" e
 * dois atalhos (WhatsApp e envio de receita). Medidas próprias da União Farma.
 */
export default function CartaoBusca() {
  const whatsapp = nacoes ? buildWhatsAppUrl(nacoes, "Oi, quero pedir medicamentos") : "#";
  return (
    <section className="cb-painel" aria-label="Buscar e pedir">
      <form className="cb-busca" action="/nacoes-unidas/produtos" method="get" role="search">
        <label className="cb-sr" htmlFor="cb-q">Buscar produto</label>
        <input id="cb-q" name="q" type="search" placeholder="Buscar remédio ou produto" autoComplete="off" />
        <button type="submit" className="cb-sr">Buscar</button>
      </form>
      <div className="cb-conteudo">
        <p className="cb-linha">Você também pode pedir por</p>
        <div className="cb-atalhos">
          <a className="cb-atalho" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="cb-atalho" href="/receita">Enviar receita</a>
        </div>
      </div>
    </section>
  );
}
