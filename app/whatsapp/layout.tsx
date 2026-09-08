import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Falar no WhatsApp" },
  robots: { index: false, follow: false },
};

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
