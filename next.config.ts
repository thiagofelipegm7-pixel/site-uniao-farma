import type { NextConfig } from "next";

// CSP: Vinext não expoe middleware por request para carimbar nonce nos
// scripts/styles inline do runtime, do GTM e dos mapas. Trocar
// 'unsafe-inline' por nonce-{n} hoje quebra analytics, CSS e o worker.
// Quando houver middleware estavel, gerar o nonce no request e so entao
// remover unsafe-inline de script-src e style-src.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://www.google.com https://pagead2.googlesyndication.com https://www.facebook.com https://connect.facebook.net https://cloudflareinsights.com",
  "frame-src https://maps.google.com https://www.google.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Canonical de cada loja: /fatima, /nacoes-unidas, /itacolomi (mesmo endereço do
  // sitemap, dos links internos, do canonical e do JSON-LD). Qualquer outro caminho
  // antigo ou alternativo da loja faz redirect permanente direto para ela (sem cadeia de redirects).
  // `permanent: true` gera 308 (equivale a 301 para o Google). Não usar `statusCode: 301`:
  // o vinext ignora esse campo e responde 307 (temporário).
  redirects: async () => [
    { source: "/nacoes-unidas/produtos/consulte-o-farmaceutico", destination: "/departamentos/medicamentos", permanent: true },
    // Lojas: variantes /unidades/* e apelidos antigos -> canonical
    { source: "/unidades/nossa-senhora-de-fatima", destination: "/fatima", permanent: true },
    { source: "/unidades/fatima", destination: "/fatima", permanent: true },
    { source: "/nossa-senhora-de-fatima", destination: "/fatima", permanent: true },
    { source: "/unidades/nacoes-unidas", destination: "/nacoes-unidas", permanent: true },
    { source: "/unidades/nacoes", destination: "/nacoes-unidas", permanent: true },
    { source: "/nacoes", destination: "/nacoes-unidas", permanent: true },
    { source: "/unidades/itacolomi", destination: "/itacolomi", permanent: true },
    // Pais de rota que nunca tiveram página (404 hoje)
    { source: "/unidades", destination: "/#unidades-rapidas", permanent: true },
    { source: "/farmacia", destination: "/farmacia-em-sabara", permanent: true },
    // Antes era redirect() de servidor (307, temporário); agora permanente
    { source: "/farmacia/sabara", destination: "/farmacia-em-sabara", permanent: true },
    // Página removida em 24/10
    { source: "/canetas-emagrecedoras", destination: "/", permanent: true },
  ],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(self), geolocation=(self), payment=()",
        },
        {
          key: "Content-Security-Policy",
          value: CONTENT_SECURITY_POLICY,
        },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/offline.html",
      headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
    },
    {
      // Arquivos do leitor de receita (OCR, ~5 MB): cache longo para a segunda leitura não baixar tudo de novo.
      source: "/ocr/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=2592000, immutable" }],
    },
    {
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
    },
    {
      source: "/_next/static/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/promotions/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
    },
    {
      source: "/novidades/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
    },
    {
      source: "/:path*.:ext(webp|svg|woff2)",
      headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
    },
    {
      source: "/:path*.:ext(ico|png|jpg|jpeg|gif)",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
    },
    // Sem catch-all de Cache-Control: o anterior (`/:path*` → max-age=0) sobrescrevia o
    // max-age do feed, do catálogo e das APIs públicas. HTML público ganha s-maxage curto
    // no middleware; rotas privadas e com sessão ficam no-store.
    {
      source: "/feeds/google-shopping.xml",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" }],
    },
    {
      source: "/api/catalogo",
      headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=60" }],
    },
    {
      source: "/api/destaques",
      headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300" }],
    },
    {
      source: "/api/marcas",
      headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300" }],
    },
    {
      source: "/api/ofertas-vitrine",
      headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=300" }],
    },
    {
      source: "/api/banners-publico",
      headers: [{ key: "Cache-Control", value: "public, max-age=60, s-maxage=60" }],
    },
  ],
};

export default nextConfig;
