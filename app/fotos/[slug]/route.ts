import { NextResponse } from "next/server";
import { PHOTOS } from "./photos";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } },
) {
  const params = await Promise.resolve(context.params);
  const slug = params.slug?.replace(/\.jpe?g$/i, "") ?? "";
  const b64 = PHOTOS[slug];
  if (!b64) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = Buffer.from(b64, "base64");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
