import { dispararSincronizacao } from "../../../../disparar-sync";

/** Pede a publicação rápida (a mesma dos outros ajustes do painel). Falha aqui não derruba o pedido: a sincronização normal publica depois. */
export async function disparar(db: Parameters<typeof dispararSincronizacao>[0]): Promise<void> {
  try {
    await dispararSincronizacao(db);
  } catch {
    // a publicação automática cobre
  }
}
