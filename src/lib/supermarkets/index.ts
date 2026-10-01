import { AlbertHeijnAdapter } from "./ah";
import type { SupermarketAdapter, SupermarketId } from "./types";

const adapters: Record<SupermarketId, SupermarketAdapter> = {
  ah: new AlbertHeijnAdapter(),
};

export function getAdapter(id: SupermarketId = "ah"): SupermarketAdapter {
  const adapter = adapters[id];
  if (!adapter) {
    throw new Error(`Unknown supermarket: ${id}`);
  }
  return adapter;
}

export function listAdapters(): SupermarketAdapter[] {
  return Object.values(adapters);
}

export type { SupermarketAdapter, SupermarketId, ProductSearchResult, BonusProduct } from "./types";
