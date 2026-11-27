import LinhasConfianca from "./LinhasConfianca";

/**
 * Respostas às três dúvidas de quem está para clicar (C-13), ao lado de "Adicionar à cesta".
 * Todos os fatos já existem no site (app/shop/confianca.ts, resumo da cesta, página de entrega). Nada novo é prometido.
 */
export default function RespostasCompra() {
  return (
    <div className="respostas-compra">
      <LinhasConfianca variante="ticks" />
      <p className="respostas-compra-texto">
        Adicionar à cesta não cobra nada e não obriga a comprar. A taxa de entrega, se você escolher receber em casa,
        aparece na cesta antes de enviar o pedido.
      </p>
    </div>
  );
}
