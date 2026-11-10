import { banco, segredo } from "../../estoque-fonte";
import { mapaDeCategorias } from "../../categoria-override";
import { mapaDeControlados } from "../../controlado-override";
import { mapaDeNomes } from "../../nomes-corrigidos";
import { mapaDeRemovidos } from "../../produtos-removidos";
import { mapaDeAprovacoes } from "../../revisao";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Lida só pela sincronização (mesmo token do catálogo): as aprovações feitas no painel de revisão. */
export async function GET(request: Request) {
  const token = segredo("CATALOGO_READ_TOKEN");
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !enviado || !iguais(token, enviado)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: true, aprovacoes: {}, nomes: {}, controlados: {}, categorias: {}, removidos: [] }, { headers: SEM_CACHE });
  const nomes = await mapaDeNomes(db).catch(() => ({}));
  const controlados = await mapaDeControlados(db).catch(() => ({}));
  const categorias = await mapaDeCategorias(db).catch(() => ({}));
  const removidos = await mapaDeRemovidos(db).catch(() => null);
  return Response.json({
    ok: true,
    aprovacoes: await mapaDeAprovacoes(db),
    nomes: Object.fromEntries(Object.entries(nomes).map(([k, v]) => [k, v.nome])),
    controlados: Object.fromEntries(Object.entries(controlados).map(([k, v]) => [k, v.estado])),
    categorias: Object.fromEntries(Object.entries(categorias).map(([k, v]) => [k, v.categoria])),
    // null = não consegui ler: a sincronização não apaga nada.
    removidos: removidos ? Object.keys(removidos) : null,
  }, { headers: SEM_CACHE });
}
