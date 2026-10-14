// Client-side access to products. The UI talks only to `ProductSource`; which provider sits
// behind the API is a server setting, so switching providers needs no UI rebuild.

import type { Product, ProductPage, ProductQuery, ProviderInfo } from '../../shared/product';
import { queryProducts } from '../../shared/query';
import { SAMPLE_PRODUCTS, SAMPLE_PROVIDER } from '../../shared/sample-catalogue';

export interface ProductSource {
  list(q: ProductQuery, signal?: AbortSignal): Promise<ProductPage>;
  /** Resolves to `{ product: null }` when the product is no longer listed. Throws when it can't be checked. */
  get(id: string, signal?: AbortSignal): Promise<{ product: Product | null; source: ProviderInfo | null }>;
}

export class ProductCheckError extends Error {}

const UNREACHABLE = "Hue's product service can't be reached right now.";

const LOCAL_CURSOR = 'local.';
/** Used only when the product API itself can't be reached (offline, static hosting). */
function localSample(q: ProductQuery, reason: string): ProductPage {
  const r = queryProducts(SAMPLE_PRODUCTS, { ...q, cursor: q.cursor?.slice(LOCAL_CURSOR.length) });
  return { source: { ...SAMPLE_PROVIDER, fallbackReason: reason }, ...r, nextCursor: r.nextCursor && LOCAL_CURSOR + r.nextCursor };
}

function toParams(q: ProductQuery) {
  const sp = new URLSearchParams();
  if (q.q) sp.set('q', q.q);
  if (q.category) sp.set('category', q.category);
  if (q.gender) sp.set('gender', q.gender);
  if (q.minPrice != null) sp.set('minPrice', String(q.minPrice));
  if (q.maxPrice != null) sp.set('maxPrice', String(q.maxPrice));
  if (q.colors?.length) sp.set('colors', q.colors.join(','));
  if (q.sort && q.sort !== 'relevance') sp.set('sort', q.sort);
  if (q.cursor) sp.set('cursor', q.cursor);
  if (q.limit) sp.set('limit', String(q.limit));
  return sp.toString();
}

async function json(res: Response) {
  // A static host answers unknown paths with index.html; treat that as "no API".
  if (!(res.headers.get('content-type') || '').includes('application/json')) throw new TypeError('not json');
  return res.json();
}

export const apiSource: ProductSource = {
  async list(q, signal) {
    if (q.cursor?.startsWith(LOCAL_CURSOR)) return localSample(q, UNREACHABLE);
    let res: Response;
    try {
      res = await fetch(`/api/products?${toParams(q)}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await json(res)) as ProductPage;
    } catch (e) {
      // Only a fresh feed may fall back to samples; a failed later page must never splice
      // sample products into a live feed, so it surfaces as a retryable error instead.
      if ((e as Error).name === 'AbortError' || q.cursor) throw e;
      return localSample(q, UNREACHABLE);
    }
  },
  async get(id, signal) {
    let res: Response;
    try {
      res = await fetch(`/api/products/${encodeURIComponent(id)}`, { signal });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      res = new Response(null, { status: 599 });
    }
    if (res.status === 404 && (res.headers.get('content-type') || '').includes('json')) return { product: null, source: null };
    if (res.ok) {
      try {
        const body = await json(res);
        return { product: body.product as Product, source: body.source as ProviderInfo };
      } catch { /* fall through */ }
    }
    if (id.startsWith('sample:')) {
      return { product: SAMPLE_PRODUCTS.find((p) => p.id === id) ?? null, source: SAMPLE_PROVIDER };
    }
    throw new ProductCheckError("We couldn't check this product with the retailer right now.");
  },
};
