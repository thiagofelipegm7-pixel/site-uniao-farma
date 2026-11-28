import LinhasConfianca from "./LinhasConfianca";
import { WHATSAPP_SLA } from "../site-config";

/**
 * Respostas às três dúvidas de quem está para clicar (C-13, C-14, P-20, W-23), ao lado de "Adicionar à cesta".
 * Todos os fatos já existem no site (app/shop/confianca.ts, resumo da cesta, página de entrega). Nada novo é prometido.
 */
export default function RespostasCompra() {
  return (
    <div className="respostas-compra">
      <LinhasConfianca variante="ticks" />
      <p className="respostas-compra-texto">
        Adicionar à cesta não cobra nada e não obriga a comprar, porque você só paga na retirada ou na entrega. A taxa de
        entrega aparece na cesta antes de enviar, e a loja responde no WhatsApp {WHATSAPP_SLA}.
      </p>
    </div>
  );
}
