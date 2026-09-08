// Fotos que eram montadas a partir de módulos base64 foram substituídas por
// arquivos estáticos em `public/`. Mantemos o mapa para preservar a rota e
// permitir que futuras fotos base64 sejam adicionadas sem reintroduzir imports
// de arquivos gerados que não fazem parte do repositório.
export const PHOTOS: Record<string, string> = {};
