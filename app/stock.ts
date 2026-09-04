import { getPublicOffers, type Offer, type OfferAvailability, type OfferUnitId } from "./offers";

export type StockStatus = OfferAvailability;

export type StockRow = {
  offerId: string;
  unit: OfferUnitId;
  status: StockStatus;
  quantity: number | null;
  updatedAt: string;
  source: "erp" | "catalog";
};

const CACHE_TTL_MS = 30_000;
const globalStore = globalThis as typeof globalThis & {
  __ufStockCache?: { savedAt: number; rows: StockRow[] };
};

function fromCatalog(): StockRow[] {
  const now = new Date().toISOString();
  return getPublicOffers().flatMap((offer) =>
    offer.units.map((unit) => ({
      offerId: offer.id,
      unit,
      status: offer.availability,
      quantity: null,
      updatedAt: now,
      source: "catalog" as const,
    })),
  );
}

function normalize(rows: unknown, source: StockRow["source"]): StockRow[] {
  if (!Array.isArray(rows)) return [];
  const allowed: StockStatus[] = ["consult", "available", "unavailable"];
  return rows.flatMap((row) => {
    const item = row as Partial<StockRow>;
    if (!item.offerId || !item.unit) return [];
    if (!allowed.includes((item.status || "consult") as StockStatus)) return [];
    return [
      {
        offerId: String(item.offerId),
        unit: item.unit as OfferUnitId,
        status: (item.status || "consult") as StockStatus,
        quantity: typeof item.quantity === "number" ? item.quantity : null,
        updatedAt: item.updatedAt || new Date().toISOString(),
        source,
      },
    ];
  });
}

export async function readStockSnapshot(): Promise<StockRow[]> {
  const cached = globalStore.__ufStockCache;
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.rows;

  const endpoint = process.env.STOCK_API_URL?.trim();
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        headers: process.env.STOCK_API_TOKEN
          ? { Authorization: `Bearer ${process.env.STOCK_API_TOKEN}` }
          : undefined,
        next: { revalidate: 30 },
      });
      if (response.ok) {
        const payload = (await response.json()) as { items?: unknown };
        const rows = normalize(payload.items ?? payload, "erp");
        if (rows.length > 0) {
          globalStore.__ufStockCache = { savedAt: Date.now(), rows };
          return rows;
        }
      }
    } catch {
      // Fall through to catalog so the flyer still works.
    }
  }

  const rows = fromCatalog();
  globalStore.__ufStockCache = { savedAt: Date.now(), rows };
  return rows;
}

export function stockLabel(status: StockStatus) {
  if (status === "available") return "Tem na loja";
  if (status === "unavailable") return "Sem estoque";
  return "Consulte";
}

export function findOfferStock(rows: StockRow[], offer: Offer, unit: OfferUnitId) {
  return (
    rows.find((row) => row.offerId === offer.id && row.unit === unit) || {
      offerId: offer.id,
      unit,
      status: offer.availability,
      quantity: null,
      updatedAt: new Date().toISOString(),
      source: "catalog" as const,
    }
  );
}
