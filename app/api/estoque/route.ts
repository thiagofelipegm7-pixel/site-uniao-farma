import { NextResponse } from "next/server";
import { readStockSnapshot } from "../../stock";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offerId = searchParams.get("offerId");
  const unit = searchParams.get("unit");
  const rows = await readStockSnapshot();
  const allowedOfferIds = new Set(rows.map((row) => row.offerId));
  const allowedUnits = new Set<string>(rows.map((row) => row.unit));
  const items = rows.filter((row) => {
    if (offerId && (!allowedOfferIds.has(offerId) || row.offerId !== offerId)) return false;
    if (unit && (!allowedUnits.has(unit) || row.unit !== unit)) return false;
    return true;
  }).map(({ offerId: id, unit: rowUnit, status, updatedAt, source }) => ({
    offerId: id,
    unit: rowUnit,
    status,
    updatedAt,
    source,
  }));

  return NextResponse.json(
    {
      live: Boolean(process.env.STOCK_API_URL),
      updatedAt: items[0]?.updatedAt ?? new Date().toISOString(),
      items,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30",
      },
    },
  );
}
