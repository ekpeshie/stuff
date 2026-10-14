// Maps rows from an authorized retailer/network product feed onto the normalized Product.
// Column names follow the Google Merchant Center spec, with aliases for the column names
// Awin, impact.com catalog exports and similar networks use. Rows without an ID or name are
// dropped; any field that's missing or unparseable becomes null — nothing is filled in.

import {
  availabilityOf, categoryOf, colorFamilyOf, genderOf, parsePrice, safeUrl,
  type Availability, type Product, type ProductColor,
} from '../../shared/product';

export type Field =
  | 'id' | 'group' | 'name' | 'brand' | 'salePrice' | 'price' | 'currency' | 'link' | 'image'
  | 'availability' | 'color' | 'size' | 'gender' | 'category' | 'description' | 'retailer';

/** First matching non-empty column wins, so order expresses preference. */
export const DEFAULT_ALIASES: Record<Field, string[]> = {
  id: ['id', 'aw_product_id', 'product_id', 'catalogitemid', 'sku', 'merchant_product_id'],
  group: ['item_group_id', 'parent_product_id', 'product_group_id'],
  name: ['title', 'product_name', 'name'],
  brand: ['brand', 'brand_name', 'manufacturer'],
  salePrice: ['sale_price', 'search_price', 'currentprice'],
  price: ['price', 'store_price', 'display_price', 'originalprice'],
  currency: ['currency', 'price_currency'],
  // Tracked network links first so clicks are attributed under the affiliate agreement.
  link: ['aw_deep_link', 'tracking_link', 'link', 'url', 'product_url', 'merchant_deep_link', 'deeplink'],
  image: ['image_link', 'aw_image_url', 'merchant_image_url', 'imageurl', 'image_url', 'large_image'],
  availability: ['availability', 'stock_status', 'stockavailability', 'in_stock'],
  color: ['color', 'colour', 'fashion:colour', 'colors'],
  size: ['size', 'fashion:size', 'sizes'],
  gender: ['gender', 'fashion:suitable_for', 'suitable_for'],
  category: ['product_type', 'merchant_category', 'category_name', 'category', 'google_product_category'],
  description: ['description', 'product_short_description', 'long_description'],
  retailer: ['merchant_name', 'advertiser_name', 'retailer', 'store', 'campaignname'],
};

export interface NormalizeOptions {
  providerId: string;
  fetchedAt: string;
  allowImages: boolean;
  /** Used when rows don't name the retailer (single-retailer feeds). */
  retailerName: string | null;
  /** Extra aliases from FEED_COLUMN_MAP, tried before the defaults. */
  aliases?: Partial<Record<Field, string[]>>;
}

const pick = (row: Record<string, string>, field: Field, opts: NormalizeOptions) => {
  for (const key of [...(opts.aliases?.[field] ?? []), ...DEFAULT_ALIASES[field]]) {
    const v = row[key.toLowerCase()];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
};

const splitList = (s: string | null) => (s ? s.split(/\s*[\/,|;]\s*/).map((x) => x.trim()).filter(Boolean) : []);
const stripHtml = (s: string | null) => (s ? s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600) || null : null);

export function normalizeRow(row: Record<string, string>, opts: NormalizeOptions): (Product & { group: string | null }) | null {
  const externalId = pick(row, 'id', opts);
  const name = pick(row, 'name', opts);
  if (!externalId || !name) return null;

  const currency = pick(row, 'currency', opts);
  const price = parsePrice(pick(row, 'salePrice', opts), currency) ?? parsePrice(pick(row, 'price', opts), currency);
  const rawCategory = pick(row, 'category', opts);
  const colors: ProductColor[] = splitList(pick(row, 'color', opts)).map((c) => ({ name: c, family: colorFamilyOf(c) }));
  const sizes = splitList(pick(row, 'size', opts));

  return {
    id: `${opts.providerId}:${externalId}`,
    providerId: opts.providerId,
    externalId,
    isSample: false,
    name,
    brand: pick(row, 'brand', opts),
    price,
    imageUrl: opts.allowImages ? safeUrl(pick(row, 'image', opts)) : null,
    retailer: { name: pick(row, 'retailer', opts) ?? opts.retailerName, productUrl: safeUrl(pick(row, 'link', opts)) },
    category: categoryOf(rawCategory, name),
    rawCategory,
    colors,
    sizes: sizes.length ? sizes : null,
    gender: genderOf(pick(row, 'gender', opts)),
    availability: availabilityOf(pick(row, 'availability', opts)),
    description: stripHtml(pick(row, 'description', opts)),
    fetchedAt: opts.fetchedAt,
    group: pick(row, 'group', opts),
  };
}

const RANK: Record<Availability, number> = { in_stock: 4, preorder: 3, backorder: 2, unknown: 1, out_of_stock: 0 };

/** Merges variant rows (same item_group_id) into one product with all colors and sizes. */
export function normalizeRows(rows: Record<string, string>[], opts: NormalizeOptions): Product[] {
  const out: Product[] = [];
  const groups = new Map<string, Product>();
  const seen = new Set<string>();
  for (const row of rows) {
    const n = normalizeRow(row, opts);
    if (!n) continue;
    const { group, ...p } = n;
    const existing = group ? groups.get(group) : undefined;
    if (existing) {
      for (const c of p.colors) if (!existing.colors.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) existing.colors.push(c);
      if (p.sizes) existing.sizes = [...new Set([...(existing.sizes ?? []), ...p.sizes])];
      if (RANK[p.availability] > RANK[existing.availability]) existing.availability = p.availability;
      continue;
    }
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    if (group) groups.set(group, p);
    out.push(p);
  }
  return out;
}
