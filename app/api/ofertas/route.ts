import { getPublicOffers } from "../../offers";

export const dynamic = "force-dynamic";

export function GET() {
  const offers = getPublicOffers().map((offer) => ({
    id: offer.id,
    name: offer.name,
    updatedAt: offer.updatedAt,
  }));

  return Response.json(
    {
      count: offers.length,
      stamp: offers.map((offer) => offer.id).sort().join(","),
      offers,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
