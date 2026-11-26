import { DEPARTAMENTOS, type Departamento } from "./departamentos";

/** Departamento público pelo nome (o catálogo guarda o nome na categoria do produto). */
export function acharDepartamentoPorNome(nome: string): Departamento | null {
  return DEPARTAMENTOS.find((d) => d.nome === nome && !d.provisorio) ?? null;
}
