export const CAMPAIGN_PARAMETER_NAMES = [
  "gclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type CampaignParameter = (typeof CAMPAIGN_PARAMETER_NAMES)[number];
export type CampaignAttribution = Partial<Record<CampaignParameter, string>>;

const STORAGE_KEY = "uniao_farma_campaign_attribution_v1";

function readStoredAttribution(): CampaignAttribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "{}") as CampaignAttribution;
  } catch {
    return {};
  }
}

export function captureCampaignAttribution(): CampaignAttribution {
  if (typeof window === "undefined") return {};

  const stored = readStoredAttribution();
  const incoming = new URLSearchParams(window.location.search);
  const next = { ...stored };

  for (const key of CAMPAIGN_PARAMETER_NAMES) {
    const value = incoming.get(key)?.trim();
    if (value) next[key] = value.slice(0, 250);
  }

  if (Object.keys(next).length > 0) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function getCampaignAttribution(): CampaignAttribution {
  return readStoredAttribution();
}
