export const OPEN_COOKIE_PREFERENCES_EVENT = "uf-open-cookie-preferences";

/** Reabre o aviso de cookies (usado pelo link "Cookies" do rodapé). */
export function openCookiePreferences(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
}
