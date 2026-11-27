import { WHATSAPP_SLA } from "../site-config";

/**
 * O que acontece depois do clique (C-14): próximo passo, canal, prazo real confirmado (P-20, L-1) e ausência de compromisso.
 */
export default function PosCliqueWhats() {
  return (
    <p className="pos-clique-whats">
      Ao tocar, abrimos o WhatsApp com o pedido pronto. Você confere e toca em enviar. A loja responde por lá{" "}
      {WHATSAPP_SLA} para confirmar o que tem em estoque e combinar a retirada ou a entrega. Você ainda não paga nada e
      pode desistir.
    </p>
  );
}
