import type { WhatsAppIntentKey } from "./whatsapp-messages";

export function IntentIcon({ intent }: { intent: WhatsAppIntentKey }) {
  if (intent === "recipe") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3h10v18H7z" />
        <path d="M10 7h4M10 11h4M10 15h3" />
      </svg>
    );
  }

  if (intent === "delivery") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 16V7h11v9" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    );
  }

  if (intent === "offer") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.6 13.4 12 22l-8.6-8.6a5 5 0 0 1 0-7.1 5 5 0 0 1 7.1 0L12 7.4l1.5-1.5a5 5 0 0 1 7.1 0 5 5 0 0 1 0 7.1z" />
        <circle cx="16" cy="8" r="1.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
