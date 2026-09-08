import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      source: "/:path*.:ext(ico|png|jpg|jpeg|webp|svg|woff2|gif)",
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
    {
      source: "/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
  ],
};

export default nextConfig;
