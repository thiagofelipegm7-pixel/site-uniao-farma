import type { ReactNode } from "react";
import NavInterna from "../components/NavInterna";

export default function InternoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <NavInterna />
      {children}
    </>
  );
}
