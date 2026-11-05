declare module "cloudflare:workers" {
  export const env: { DB?: unknown };
  export function waitUntil(promise: Promise<unknown>): void;
}
