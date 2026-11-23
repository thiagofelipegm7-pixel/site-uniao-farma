// Substitui "cloudflare:workers" nos testes de HTML no Node.
// No Worker de verdade o binding existe; aqui o app já cai para process.env / null.
export const env = new Proxy({}, { get: () => undefined });
