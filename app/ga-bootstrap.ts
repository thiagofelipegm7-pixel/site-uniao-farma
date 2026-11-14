/**
 * GA4 direto (gtag.js) com Google Consent Mode v2.
 * Nada é carregado do Google antes do aceite no banner: este trecho só prepara a fila (dataLayer) e, se o visitante
 * já aceitou numa visita anterior, libera o consentimento e carrega o gtag.js. Quem aceita agora tem o gtag.js
 * carregado pelo AnalyticsConsent. É o que o banner ("Analytics só com autorização") e a /privacidade prometem.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-1N8E5G39KF";
export const CONSENT_STORAGE_KEY = "uniao_farma_cookie_consent_v1";
export const GTAG_SCRIPT_ID = "uniao-farma-gtag";
export const GTAG_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";

export function getGtagBootstrapScript(): string {
  const ads = GOOGLE_ADS_ID ? `gtag('config',${JSON.stringify(GOOGLE_ADS_ID)});` : "";
  return [
    // Telas internas da equipe não entram na medição: o Google ignora todo envio com esta chave ligada.
    `var interno=location.pathname.indexOf('/interno')===0;if(interno){window[${JSON.stringify(`ga-disable-${GA_MEASUREMENT_ID}`)}]=true;}`,
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag=gtag;",
    "gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});",
    `var aceito=false;try{aceito=localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})==='accepted';}catch(e){}`,
    "if(aceito){gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}",
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(GA_MEASUREMENT_ID)},{anonymize_ip:true});`,
    ads,
    // Só com o aceite guardado (e fora do painel da equipe) o navegador busca o gtag.js. Sem aceite, nenhum pedido sai para o Google.
    `if(aceito&&!interno){var s=document.createElement('script');s.id=${JSON.stringify(GTAG_SCRIPT_ID)};s.async=true;s.src=${JSON.stringify(GTAG_SCRIPT_URL)};document.head.appendChild(s);}`,
  ].join("");
}
