"use client";

import { useSyncExternalStore } from "react";
import { assinarReserva, lerReserva, lerReservaServidor, type ReservaEstado } from "./reserva-store";

/** Estado da reserva. No servidor e na primeira pintura vem vazio, então não há diferença de hidratação. */
export function useReserva(): ReservaEstado {
  return useSyncExternalStore(assinarReserva, lerReserva, lerReservaServidor);
}
