import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Protected revalidation endpoint for production cache busting.
// Usage: POST /api/revalidate?token=<REVALIDATE_SECRET>
// Clears ISR cache for products, product-lines, and categories.

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET not configured" }, { status: 500 });
  }
  if (token !== secret) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  revalidateTag("products", {});
  revalidateTag("product-lines", {});
  revalidateTag("categories", {});
  revalidatePath("/es/productos");
  revalidatePath("/en/productos");

  return NextResponse.json({
    revalidated: true,
    tags: ["products", "product-lines", "categories"],
    paths: ["/es/productos", "/en/productos"],
    timestamp: new Date().toISOString(),
  });
}
