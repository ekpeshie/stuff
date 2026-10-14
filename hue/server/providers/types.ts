import type { Product, ProductQuery, ProviderInfo } from '../../shared/product';

export interface SearchResult {
  items: Product[];
  nextCursor: string | null;
  total: number | null;
}

/**
 * A source of real (or sample) products. Implementations run on the server only, so
 * credentials stay out of the browser. To add a provider, implement this interface and
 * register it in `server/config.ts`; the UI needs no changes.
 */
export interface ProductProvider {
  info(): ProviderInfo;
  /** Throws `ProviderError` when the provider can't be reached or is misconfigured. */
  search(q: ProductQuery): Promise<SearchResult>;
  /**
   * Re-reads one product so price and availability are current. Resolves to null when the
   * provider no longer lists it (sold out and removed, or delisted).
   */
  get(externalId: string): Promise<Product | null>;
}

export class ProviderError extends Error {
  /** Safe to show to users: no URLs, keys or stack details. */
  readonly publicMessage: string;
  constructor(publicMessage: string, detail?: string) {
    super(detail ? `${publicMessage} (${detail})` : publicMessage);
    this.publicMessage = publicMessage;
  }
}
