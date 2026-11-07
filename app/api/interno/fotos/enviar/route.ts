import { banco } from "../../../../estoque-fonte";
import { carregarCatalogoCompleto, slugify } from "../../../../nacoes-unidas/produtos/catalogo";
import { guardarFoto, validarEnvio } from "../../../../fotos-enviadas";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Recebe a foto de um produto enviada pelo painel interno (a senha da equipe é pedida pelo middleware). */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const conferido = validarEnvio(corpo);
  if (!conferido.ok) return Response.json({ ok: false, erro: conferido.erro }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  // Página do produto (se existir) para a foto já aparecer no site antes da publicação.
  const slug = slugify(conferido.envio.nome);
  const temPagina = carregarCatalogoCompleto().itens.some((i) => slugify(i.nome) === slug);
  await guardarFoto(db, conferido.envio, temPagina ? slug : null);
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
