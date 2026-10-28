/**
 * GA4 direto (gtag.js) com Google Consent Mode v2.
 * Carrega em toda página, com tudo "denied" até o visitante aceitar o banner.
 * Sem consentimento o Google recebe só pings sem cookies (contagem modelada).
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-1N8E5G39KF";
export const CONSENT_STORAGE_KEY = "uniao_farma_cookie_consent_v1";
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "";

export function getGtagBootstrapScript(): string {
  const ads = GOOGLE_ADS_ID ? `gtag('config',${JSON.stringify(GOOGLE_ADS_ID)});` : "";
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag=gtag;",
    "gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});",
    `try{if(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})==='accepted'){gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}}catch(e){}`,
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(GA_MEASUREMENT_ID)},{anonymize_ip:true});`,
    ads,
  ].join("");
}
