import { NextResponse } from "next/server";
import { PHOTOS } from "./photos";

function jpegFromBase64(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } },
) {
  const params = await Promise.resolve(context.params);
  const slug = params.slug?.replace(/\.jpe?g$/i, "") ?? "";
  const b64 = PHOTOS[slug];
  if (!b64) {
    // Preserve old photo URLs after moving the image to a public static asset.
    // This avoids a 404 for cached pages while keeping the Worker bundle free
    // of the removed base64 modules.
    if (slug === "fatima-interior") {
      return NextResponse.redirect(new URL("/uniao-farma-perfumaria.webp?v=27", request.url), 308);
    }
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const bytes = jpegFromBase64(b64);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
