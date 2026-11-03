/** Evento que abre o seletor de loja (pino do cabeçalho e "Trocar" da barra da loja). */
export const EVENTO_ABRIR_LOJA = "uf-abrir-loja";

export function abrirSeletorDeLoja(): void {
  window.dispatchEvent(new Event(EVENTO_ABRIR_LOJA));
}

/** Evento que abre a gaveta "Departamentos" (botão do cabeçalho e do menu do celular). */
export const EVENTO_ABRIR_DEPARTAMENTOS = "uf-abrir-departamentos";

export function abrirDepartamentos(): void {
  window.dispatchEvent(new Event(EVENTO_ABRIR_DEPARTAMENTOS));
}
