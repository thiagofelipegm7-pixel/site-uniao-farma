/**
 * Soltar no painel uma imagem arrastada de OUTRO site (Google Imagens, site do fabricante...): o navegador não manda o
 * arquivo, só o endereço e o HTML da imagem. Aqui sai a lista de endereços a tentar, do melhor para o pior.
 */
export type Arraste = { uriList: string; html: string; texto: string };

const ehHttps = (u: string) => /^https:\/\/[^\s]+$/i.test(u);

export function candidatosDoArraste(a: Arraste): string[] {
  const saida: string[] = [];
  const add = (u: string | null | undefined) => {
    const v = (u ?? "").trim();
    if (v && (ehHttps(v) || /^data:image\/(png|jpe?g|webp);base64,/i.test(v)) && !saida.includes(v)) saida.push(v);
  };
  const links = [...a.uriList.split(/\r?\n/), a.texto].map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  // Google Imagens (e outros) mandam o link da página; a imagem em tamanho real vem no parâmetro imgurl.
  for (const l of links) {
    try {
      add(new URL(l).searchParams.get("imgurl"));
    } catch {
      // não é um endereço
    }
  }
  for (const m of a.html.matchAll(/<img\s[^>]*?\bsrc=["']([^"']+)["']/gi)) add(m[1].replace(/&amp;/g, "&"));
  for (const l of links) add(l);
  return saida;
}
