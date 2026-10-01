import type {
  BonusProduct,
  ProductSearchResult,
  SupermarketAdapter,
} from "./types";

const BASE = "https://api.ah.nl";
const USER_AGENT = "Appie/8.22.3";
const APPLICATION = "AHWEBSHOP";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
};

type AhImage = { url?: string; width?: number; height?: number };

type AhProduct = {
  webshopId?: number | string;
  id?: number | string;
  title?: string;
  brand?: string;
  salesUnitSize?: string;
  price?: {
    now?: number;
    was?: number;
    unitSize?: string;
  };
  images?: AhImage[];
  isBonus?: boolean;
  bonusMechanism?: string;
  discountLabels?: Array<{ defaultDescription?: string }>;
};

type BonusMetadataResponse = {
  periods?: Array<{
    bonusStartDate?: string;
    bonusEndDate?: string;
    tabs?: Array<{
      urlMetadataList?: Array<{
        description?: string;
        bonusType?: string;
      }>;
    }>;
  }>;
};

type BonusSectionResponse = {
  bonusGroupOrProducts?: Array<{
    product?: AhProduct;
    bonusGroup?: {
      id?: string;
      segmentDescription?: string;
      discountDescription?: string;
      products?: AhProduct[];
    };
  }>;
};

type GraphQLBonusResponse = {
  data?: {
    bonusPromotions?: Array<{
      id?: string;
      title?: string;
      products?: Array<{ id?: number; title?: string }>;
    }>;
  };
};

const FETCH_GROUP_QUERY = `query FetchBonusPromotionWithProducts(
  $id: String,
  $periodStart: String,
  $periodEnd: String,
  $filterUnavailableProducts: Boolean,
  $forcePromotionVisibility: Boolean = true,
  $showAllPromotionSegments: Boolean = true
) {
  bonusPromotions(
    input: {
      id: $id
      periodStart: $periodStart
      periodEnd: $periodEnd
      filterUnavailableProducts: $filterUnavailableProducts
      forcePromotionVisibility: $forcePromotionVisibility
      showAllPromotionSegments: $showAllPromotionSegments
    }
  ) {
    id
    title
    products { id title }
  }
}`;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAnonymousToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const res = await fetch(`${BASE}/mobile-auth/v1/auth/token/anonymous`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ clientId: "appie" }),
  });

  if (!res.ok) {
    throw new Error(`AH auth failed: ${res.status}`);
  }

  const data = (await res.json()) as TokenResponse;
  const ttlMs = Math.max((data.expires_in ?? 3600) - 60, 60) * 1000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

function ahHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    "X-Application": APPLICATION,
  };
}

async function ahFetch<T>(path: string): Promise<T> {
  const token = await getAnonymousToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: ahHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AH API ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

async function ahGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const token = await getAnonymousToken();
  const res = await fetch(`${BASE}/graphql`, {
    method: "POST",
    headers: ahHeaders(token),
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AH GraphQL failed: ${res.status} ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

function pickImage(images?: AhImage[]): string | undefined {
  if (!images?.length) return undefined;
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return sorted.find((i) => i.url)?.url;
}

function productId(p: AhProduct): string | null {
  const raw = p.webshopId ?? p.id;
  return raw == null ? null : String(raw);
}

function mapSearchProduct(p: AhProduct): ProductSearchResult | null {
  const id = productId(p);
  if (!id || !p.title) return null;
  return {
    id,
    name: p.title,
    brand: p.brand,
    price: p.price?.now,
    unitSize: p.price?.unitSize ?? p.salesUnitSize,
    imageUrl: pickImage(p.images),
    isBonus: p.isBonus,
    bonusLabel: p.bonusMechanism ?? p.discountLabels?.[0]?.defaultDescription,
  };
}

function mapBonusProduct(
  p: AhProduct,
  fallbackLabel?: string,
): BonusProduct | null {
  const id = productId(p);
  if (!id || !p.title) return null;
  return {
    id,
    name: p.title,
    imageUrl: pickImage(p.images),
    price: p.price?.now,
    priceBeforeBonus: p.price?.was,
    bonusLabel:
      p.bonusMechanism ??
      p.discountLabels?.[0]?.defaultDescription ??
      fallbackLabel,
  };
}

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export class AlbertHeijnAdapter implements SupermarketAdapter {
  readonly id = "ah" as const;
  readonly label = "Albert Heijn";

  async searchProducts(query: string): Promise<ProductSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const data = await ahFetch<{ products?: AhProduct[] }>(
      `/mobile-services/product/search/v2?query=${encodeURIComponent(q)}&page=0&size=24`,
    );

    return (data.products ?? [])
      .map(mapSearchProduct)
      .filter((p): p is ProductSearchResult => p != null);
  }

  async fetchCurrentBonus(): Promise<BonusProduct[]> {
    const out = new Map<string, BonusProduct>();
    const pendingGroups: Array<{ id: string; label?: string }> = [];
    const date = todayIso();

    const metadata = await ahFetch<BonusMetadataResponse>(
      "/mobile-services/bonuspage/v3/metadata",
    );

    const period = metadata.periods?.[0];
    const periodStart = period?.bonusStartDate ?? date;
    const periodEnd = period?.bonusEndDate ?? date;

    const categories = new Set<string>();
    for (const p of metadata.periods ?? []) {
      for (const tab of p.tabs ?? []) {
        for (const meta of tab.urlMetadataList ?? []) {
          if (meta.bonusType === "NATIONAL" && meta.description) {
            categories.add(meta.description);
          }
        }
      }
    }

    try {
      const spotlight = await ahFetch<BonusSectionResponse>(
        `/mobile-services/bonuspage/v2/section/spotlight?application=${APPLICATION}&date=${date}`,
      );
      this.collectSection(spotlight, out, pendingGroups);
    } catch {
      // optional
    }

    for (const category of categories) {
      const params = new URLSearchParams({
        application: APPLICATION,
        date,
        promotionType: "NATIONAL",
        category,
      });
      try {
        const section = await ahFetch<BonusSectionResponse>(
          `/mobile-services/bonuspage/v2/section?${params.toString()}`,
        );
        this.collectSection(section, out, pendingGroups);
      } catch {
        // keep going
      }
    }

    // Expand groups that only expose a segment id
    const uniqueGroups = [
      ...new Map(pendingGroups.map((g) => [g.id, g])).values(),
    ];

    for (const group of uniqueGroups) {
      try {
        const gql = await ahGraphQL<GraphQLBonusResponse>(FETCH_GROUP_QUERY, {
          id: group.id,
          periodStart,
          periodEnd,
          filterUnavailableProducts: true,
          forcePromotionVisibility: true,
          showAllPromotionSegments: true,
        });
        for (const promo of gql.data?.bonusPromotions ?? []) {
          for (const p of promo.products ?? []) {
            if (p.id == null || !p.title) continue;
            const id = String(p.id);
            if (out.has(id)) continue;
            out.set(id, {
              id,
              name: p.title,
              bonusLabel: group.label ?? promo.title,
            });
          }
        }
      } catch {
        // group expansion can fail for some segments
      }
    }

    return [...out.values()];
  }

  private collectSection(
    section: BonusSectionResponse,
    out: Map<string, BonusProduct>,
    pendingGroups: Array<{ id: string; label?: string }>,
  ) {
    for (const item of section.bonusGroupOrProducts ?? []) {
      if (item.product) {
        const mapped = mapBonusProduct(item.product);
        if (mapped) out.set(mapped.id, mapped);
      }
      if (item.bonusGroup) {
        const label =
          item.bonusGroup.discountDescription ??
          item.bonusGroup.segmentDescription;
        const products = item.bonusGroup.products ?? [];
        if (products.length > 0) {
          for (const p of products) {
            const mapped = mapBonusProduct(p, label);
            if (mapped) out.set(mapped.id, mapped);
          }
        } else if (item.bonusGroup.id) {
          pendingGroups.push({ id: item.bonusGroup.id, label });
        }
      }
    }
  }
}
