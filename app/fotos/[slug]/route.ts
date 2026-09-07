import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const ALLOWED = new Set([
  "bio-extratus",
  "salon-line-cremes",
  "rexona-clinical",
  "dove-oleo-serum",
  "salon-line-matizadora",
  "dove-banho",
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } },
) {
  const params = await Promise.resolve(context.params);
  const slug = params.slug?.replace(/\.jpe?g$/i, "") ?? "";
  if (!ALLOWED.has(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const chunks: string[] = [];
    for (let i = 1; i <= 6; i += 1) {
      try {
        const filePath = path.join(process.cwd(), "public", "fotos", `${slug}.${i}.b64`);
        chunks.push(await readFile(filePath, "utf8"));
      } catch {
        break;
      }
    }
    if (chunks.length === 0) {
      const filePath = path.join(process.cwd(), "public", "fotos", `${slug}.b64`);
      chunks.push(await readFile(filePath, "utf8"));
    }
    const body = Buffer.from(chunks.join("").replace(/\s+/g, ""), "base64");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
