import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Falar no WhatsApp | União Farma",
  description: "Toque na loja do seu bairro em Sabará. O WhatsApp abre com a conversa pronta.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/whatsapp" },
};

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
