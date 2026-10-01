export type SupermarketId = "ah";

export type ProductSearchResult = {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  unitSize?: string;
  imageUrl?: string;
  isBonus?: boolean;
  bonusLabel?: string;
};

export type BonusProduct = {
  id: string;
  name: string;
  imageUrl?: string;
  price?: number;
  priceBeforeBonus?: number;
  bonusLabel?: string;
};

export interface SupermarketAdapter {
  readonly id: SupermarketId;
  readonly label: string;
  searchProducts(query: string): Promise<ProductSearchResult[]>;
  fetchCurrentBonus(): Promise<BonusProduct[]>;
}
