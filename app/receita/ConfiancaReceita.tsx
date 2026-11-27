import { COMPANY } from "../company";
import { WHATSAPP_SLA } from "../site-config";
import NotasGoogle from "../shop/NotasGoogle";

/**
 * Prova real, três medos respondidos e transparência pós-clique na página /receita
 * (C-03, C-05, C-08, C-13, C-14, C-16; R-03, R-05, R-11, V-01, P-20, L-1).
 * Prazo confirmado pela loja em 27/11/2026. Notas são das lojas no Google, não de medicamento (P-15 / R-06).
 */
export default function ConfiancaReceita() {
  return (
    <section className="recipe-confianca" aria-labelledby="recipe-confianca-titulo">
      <h2 id="recipe-confianca-titulo">O que acontece depois que você anexa a receita</h2>

      <p className="recipe-pos-clique">
        Ao enviar a foto ou o PDF, os nomes dos remédios são lidos na hora e o site mostra o que tem na loja Nações Unidas.
        Você confere a lista antes de colocar na cesta ou falar no WhatsApp — a equipe responde {WHATSAPP_SLA}, nada é
        cobrado aqui e você pode desistir a qualquer momento. Medicamento sob prescrição só é dispensado após avaliação
        do farmacêutico.
      </p>

      <ul className="recipe-medos">
        <li>
          <strong>Preciso pagar agora?</strong> Não. Ler a receita é gratuito e você só paga na retirada ou na entrega.
        </li>
        <li>
          <strong>Minha receita fica salva no site?</strong> Não. Primeiro o seu próprio aparelho tenta ler a receita. Se não
          conseguir, a imagem é enviada a um serviço de leitura automática por inteligência artificial (Google Gemini ou Cloudflare)
          só para ler os nomes dos remédios. O site não guarda a foto nem o PDF.
        </li>
        <li>
          <strong>E se faltar um remédio ou vier um nome errado?</strong> É só desmarcar na lista e tirar a dúvida direto com o farmacêutico no WhatsApp.
        </li>
      </ul>

      <p className="recipe-rt">
        Farmacêutico responsável: {COMPANY.pharmacist.name} ·{" "}
        <a
          href={COMPANY.pharmacist.lookupUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${COMPANY.pharmacist.crf} — consultar registro no CRF/MG (abre em nova aba)`}
        >
          {COMPANY.pharmacist.crf}
        </a>
      </p>

      <NotasGoogle className="notas-google--receita" />
    </section>
  );
}
