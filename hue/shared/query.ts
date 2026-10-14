// Filtering, sorting and cursor pagination over an in-memory product list.
// Used by providers that hold a cached catalogue (feeds, samples) and by the client's
// offline sample fallback, so both behave identically.

import { COLOR_FAMILIES, type Product, type ProductQuery } from './product';

export const DEFAULT_LIMIT = 48;
export const MAX_LIMIT = 100;

const encodeCursor = (offset: number) => `o${offset}`;
const decodeCursor = (c: string | null | undefined) => {
  const m = c?.match(/^o(\d+)$/);
  return m ? Number(m[1]) : 0;
};

const searchText = (p: Product) =>
  [p.name, p.brand, p.rawCategory, p.category, p.retailer.name, ...p.colors.map((c) => c.name), ...p.colors.map((c) => (c.family ? COLOR_FAMILIES[c.family][0] : ''))]
    .filter(Boolean).join(' ').toLowerCase();

export function queryProducts(all: Product[], q: ProductQuery) {
  const terms = (q.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  let list = all.filter((p) => {
    if (q.ids && !q.ids.includes(p.id)) return false;
    if (q.category && p.category !== q.category) return false;
    // Unisex pieces show under both women and men.
    if (q.gender && p.gender && p.gender !== q.gender && p.gender !== 'unisex') return false;
    if (q.gender === 'unisex' && p.gender !== 'unisex') return false;
    if (q.minPrice != null && !(p.price && p.price.amount >= q.minPrice)) return false;
    if (q.maxPrice != null && !(p.price && p.price.amount <= q.maxPrice)) return false;
    if (q.colors?.length && !p.colors.some((c) => c.family && q.colors!.includes(c.family))) return false;
    if (terms.length) {
      const t = searchText(p);
      if (!terms.every((w) => t.includes(w))) return false;
    }
    return true;
  });

  if (q.colors && q.colors.length > 1) {
    // Pieces that combine more of the chosen colors first.
    const n = (p: Product) => p.colors.filter((c) => c.family && q.colors!.includes(c.family)).length;
    list = list.map((p, i) => ({ p, i, n: n(p) })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.p);
  }
  if (q.sort === 'price_asc' || q.sort === 'price_desc') {
    const dir = q.sort === 'price_asc' ? 1 : -1;
    // Unpriced items always sort last; never treat a missing price as zero.
    list = list.slice().sort((a, b) => (a.price ? (b.price ? dir * (a.price.amount - b.price.amount) : -1) : b.price ? 1 : 0));
  }

  const limit = Math.min(Math.max(1, q.limit || DEFAULT_LIMIT), MAX_LIMIT);
  const offset = decodeCursor(q.cursor);
  const items = list.slice(offset, offset + limit);
  return { items, total: list.length, nextCursor: offset + limit < list.length ? encodeCursor(offset + limit) : null };
}
