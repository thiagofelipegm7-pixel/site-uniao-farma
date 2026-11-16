import { IconWhats } from "../reserva/ReservaIcons";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";
import "./pedir-alternativas.css";

/** Painel abaixo da busca da home: outras formas de pedir (WhatsApp da loja e envio da receita). */
export default function PedirAlternativas() {
  const nacoes = PUBLIC_UNITS.find((u) => u.id === "nacoes");
  const whats = nacoes
    ? buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Quero fazer um pedido.", { campaign: "home", content: "alternativas" })
    : null;
  return (
    <section className="pedir-alt" aria-labelledby="pedir-alt-titulo">
      <p id="pedir-alt-titulo" className="pedir-alt-titulo">Você também pode pedir por</p>
      <div className="pedir-alt-botoes">
        {whats ? (
          <a className="pedir-alt-card" href={whats} target="_blank" rel="noreferrer">
            <IconWhats size={24} oficial />
            <span>WhatsApp</span>
          </a>
        ) : null}
        <a className="pedir-alt-card" href="/nacoes-unidas/produtos/receita">
          <span>Enviar receita</span>
        </a>
      </div>
    </section>
  );
}
