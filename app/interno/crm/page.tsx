import type { Metadata } from "next";
import CrmClient from "./CrmClient";
import "./crm.css";

export const metadata: Metadata = {
  title: "CRM WhatsApp | Área interna",
  robots: { index: false, follow: false },
};

export default function CrmPage() {
  return <CrmClient />;
}
