import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAdapter } from "@/lib/supermarkets";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const supermarket = (searchParams.get("supermarket") ?? "ah") as "ah";

  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const adapter = getAdapter(supermarket);
    const products = await adapter.searchProducts(q);
    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        supermarket: adapter.id,
        supermarketLabel: adapter.label,
      })),
    });
  } catch (error) {
    console.error("search error", error);
    return NextResponse.json(
      { error: "Zoeken mislukt. Probeer het later opnieuw." },
      { status: 502 },
    );
  }
}
