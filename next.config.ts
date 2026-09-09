import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  redirects: async () => [
    { source: "/unidades/nossa-senhora-de-fatima", destination: "/fatima", permanent: true },
    { source: "/unidades/nacoes-unidas", destination: "/nacoes-unidas", permanent: true },
    { source: "/unidades/itacolomi", destination: "/itacolomi", permanent: true },
    { source: "/nossa-senhora-de-fatima", destination: "/fatima", permanent: true },
  ],
  headers: async () => [
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
    {
      source: "/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
  ],
};

export default nextConfig;
