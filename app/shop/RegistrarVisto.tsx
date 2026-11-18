"use client";

import { useEffect } from "react";
import { guardarVisto } from "../vistos-recentemente";

/** Não desenha nada: guarda no navegador que esta página de produto foi aberta (para "Visto recentemente" na home). */
export default function RegistrarVisto({ slug }: { slug: string }) {
  useEffect(() => {
    guardarVisto(slug);
  }, [slug]);
  return null;
}
