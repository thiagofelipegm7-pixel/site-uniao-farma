import { NextResponse } from "next/server";
import { readStockSnapshot } from "../../stock";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offerId = searchParams.get("offerId");
  const unit = searchParams.get("unit");
  const rows = await readStockSnapshot();
  const items = rows.filter((row) => {
    if (offerId && row.offerId !== offerId) return false;
    if (unit && row.unit !== unit) return false;
    return true;
  });

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
