import { AVALIACOES_CESTA } from "../data/avaliacoes-google";
import { WHATSAPP_SLA } from "../site-config";
import NotasGoogle from "../shop/NotasGoogle";

const AVALIACOES_ENTREGA = AVALIACOES_CESTA.filter((a) => /entrega/i.test(a.texto));

/**
 * Prova social específica sobre entrega (C-07, C-08, C-16, C-17, L-1, V-03) +
 * três objeções e transparência pós-clique com prazo real confirmado (C-13, C-14, P-20).
 * Usa exclusivamente avaliações públicas reais do Google (app/data/avaliacoes-google.ts).
 */
export default function ProvaEntrega() {
  return (
    <section className="section" aria-labelledby="prova-entrega-titulo">
      <div className="section-inner">
        <div className="prova-entrega">
          <h2 id="prova-entrega-titulo">Como funciona depois que você chama no WhatsApp</h2>
          <p className="prova-entrega-pos">
            Ao tocar no WhatsApp da sua loja, você já abre a conversa pronta. A equipe responde {WHATSAPP_SLA},
            confirma o que tem em estoque, informa a taxa exata do seu bairro e combina a entrega ou retirada — nada é
            cobrado no site e você pode desistir antes de confirmar.
          </p>

          <ul className="prova-entrega-medos">
            <li>
              <strong>Preciso pagar adiantado?</strong> Não. O pagamento é feito na entrega ou no balcão (Pix, dinheiro ou cartão).
            </li>
            <li>
              <strong>Vou ter surpresa com a taxa?</strong> Não. A tabela desta página já mostra a taxa confirmada por bairro antes do pedido.
            </li>
            <li>
              <strong>E se eu preferir retirar?</strong> A retirada na loja é sempre gratuita e você já sai com o pedido separado.
            </li>
          </ul>

          {AVALIACOES_ENTREGA.length > 0 ? (
            <div className="prova-entrega-depoimentos">
              <h3>O que clientes dizem sobre a entrega no Google</h3>
              <ul>
                {AVALIACOES_ENTREGA.map((av) => (
                  <li key={av.id}>
                    <blockquote>“{av.texto}”</blockquote>
                    <p className="prova-entrega-autor">
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
            </div>
          ) : null}

          <NotasGoogle className="notas-google--entrega" />
        </div>
      </div>
    </section>
  );
}
