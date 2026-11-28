import { SITE_URL } from "../../site-config";
import { webhookConfigStatus } from "../../whatsapp-cloud";

export const metadata = {
  title: "WhatsApp Business",
  robots: { index: false, follow: false },
};

export default function WhatsAppSetupPage() {
  const status = webhookConfigStatus();

  return (
    <div className="metrics-page">
      <section className="section-inner">
        <p className="eyebrow">Uso interno</p>
        <h1>WhatsApp Business</h1>
        <p>
          Configure a conta da Meta para receber conversas das unidades no CRM e contabilizar os atendimentos.
        </p>

        <h2>Estado agora</h2>
        <ul>
          <li>Verify token: {status.verifyTokenReady ? "ok" : "faltando"}</li>
          <li>App secret: {status.appSecretReady ? "ok" : "faltando"}</li>
          <li>Access token: {status.accessTokenReady ? "ok" : "faltando"}</li>
          <li>{"Fátima: "}{status.phoneIds.fatima ? "ok" : "faltando Phone ID"}</li>
          <li>{"Nações: "}{status.phoneIds.nacoes ? "ok" : "faltando Phone ID"}</li>
          <li>Itacolomi: {status.phoneIds.itacolomi ? "ok" : "faltando Phone ID"}</li>
        </ul>

        <h2>No painel da Meta</h2>
        <ol>
          <li>Abra developers.facebook.com e o app da União Farma.</li>
          <li>WhatsApp → Configuração → Webhook.</li>
          <li>
            URL de retorno: <code>{`${SITE_URL}/api/whatsapp/webhook`}</code>
          </li>
          <li>Verify token: o mesmo valor de WHATSAPP_VERIFY_TOKEN no Cloudflare.</li>
          <li>Assine o campo messages.</li>
          <li>Coloque o Phone number ID de cada loja nas variáveis WHATSAPP_PHONE_ID_FATIMA, NACOES e ITACOLOMI.</li>
        </ol>

        <p>
          Configure as variáveis da Meta no Worker e defina <code>CRM_WHATSAPP_ENABLED=on</code> para receber as
          conversas no CRM.
        </p>
        <p>
          <a href="/interno/crm">Abrir CRM de WhatsApp</a>
        </p>
        <p>
          <a href="/interno/metricas">Ver contatos e vendas</a>
        </p>
      </section>
    </div>
  );
}
