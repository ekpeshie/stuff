// Normalized product model shared by the server (provider adapters) and the client.
// Every provider maps its own records into `Product`; the UI only ever sees this shape.

/** Color families the app understands. Provider color names are mapped onto these. */
export const COLOR_FAMILIES = {
  cream: ['Cream', '#E9DFC9'], ivory: ['Ivory', '#F2EEE4'], white: ['Optic white', '#F6F6F2'], camel: ['Camel', '#BE9468'], tan: ['Tan', '#B08560'],
  chocolate: ['Chocolate', '#5B3A29'], rust: ['Rust', '#A24E2B'], mustard: ['Mustard', '#C6962F'], olive: ['Olive', '#68663A'], sage: ['Sage', '#9AA488'],
  forest: ['Forest', '#2E4836'], emerald: ['Emerald', '#1E5A49'], navy: ['Navy', '#1E2943'], blue: ['Light blue', '#9DB4CF'], denim: ['Denim', '#475F80'],
  lavender: ['Lavender', '#B5ACC9'], rose: ['Dusty rose', '#C6929A'], pink: ['Blush', '#E8BFC4'], coral: ['Coral', '#D67A61'], burgundy: ['Burgundy', '#682233'],
  red: ['Cherry', '#A9282E'], charcoal: ['Charcoal', '#3A3A3C'], grey: ['Stone grey', '#A7A6A2'], black: ['Black', '#19191B'],
} as const satisfies Record<string, readonly [string, string]>;

export type ColorFamily = keyof typeof COLOR_FAMILIES;
export const isColorFamily = (s: string): s is ColorFamily => Object.prototype.hasOwnProperty.call(COLOR_FAMILIES, s);

export const CATEGORIES = ['Tops', 'Trousers', 'Dresses', 'Jackets', 'Shoes', 'Accessories', 'Outfits'] as const;
export type Category = (typeof CATEGORIES)[number];
export const isCategory = (s: string): s is Category => (CATEGORIES as readonly string[]).includes(s);

export type Availability = 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder' | 'unknown';
export type Gender = 'women' | 'men' | 'unisex';

export interface ProductColor {
  /** Name as the retailer lists it, e.g. "Washed Olive". */
  name: string;
  /** Best-effort family for palette matching; null when the name doesn't map to one. */
  family: ColorFamily | null;
}

export interface Product {
  /** Globally unique: `${providerId}:${externalId}`. */
  id: string;
  providerId: string;
  externalId: string;
  /** True for illustrative sample data. Sample products are never presented as real inventory. */
  isSample: boolean;
  name: string;
  /** Null when the provider doesn't supply a brand — never guessed. */
  brand: string | null;
  /** Null when the provider doesn't supply a parseable price — never guessed. */
  price: { amount: number; currency: string } | null;
  /** Only set when the provider's terms allow displaying it (see ProviderInfo.imagePolicy). */
  imageUrl: string | null;
  retailer: {
    name: string | null;
    /** The retailer's (or network's tracked) product page. Null when none was supplied. */
    productUrl: string | null;
  };
  category: Category | null;
  /** Provider's own category text, kept for search. */
  rawCategory: string | null;
  colors: ProductColor[];
  sizes: string[] | null;
  gender: Gender | null;
  availability: Availability;
  description: string | null;
  /** ISO time the price and availability were last fetched from the provider. */
  fetchedAt: string;
  /** Sample-only extras used to draw placeholder imagery. */
  sample?: { shot: string; ratio: number; tag: string | null; styles: string[] };
}

export type SortKey = 'relevance' | 'price_asc' | 'price_desc';
export const SORT_LABELS: Record<SortKey, string> = { relevance: 'Relevance', price_asc: 'Price: low to high', price_desc: 'Price: high to low' };

export interface ProductQuery {
  q?: string;
  category?: Category;
  gender?: Gender;
  minPrice?: number;
  maxPrice?: number;
  /** Match any of these color families. */
  colors?: ColorFamily[];
  /** Restrict to these product IDs (used by the Saved view). */
  ids?: string[];
  sort?: SortKey;
  cursor?: string | null;
  limit?: number;
}

export interface ProviderInfo {
  id: string;
  label: string;
  kind: 'live' | 'sample';
  /** How product images may be used under the provider's terms. */
  imagePolicy: 'direct' | 'none';
  /** Prices and availability older than this must not be shown as current. */
  priceMaxAgeMs: number;
  sorts: SortKey[];
  /** Human-readable explanation when the app fell back to sample products. */
  fallbackReason?: string;
}

export interface ProductPage {
  source: ProviderInfo;
  items: Product[];
  nextCursor: string | null;
  total: number | null;
}

// ---------- Normalization helpers (used by adapters) ----------

// Ordered: more specific phrases first so "light blue" wins over "blue".
const COLOR_WORDS: [RegExp, ColorFamily][] = [
  [/\b(off[- ]?white|ecru|oat(meal)?|stone|sand|bone|natural|cream|beige)\b/, 'cream'],
  [/\b(ivory|vanilla)\b/, 'ivory'],
  [/\b(light|pale|sky|baby|powder|ice) ?blue\b/, 'blue'],
  [/\b(denim|indigo|chambray|washed blue|mid blue|dark wash|mid wash)\b/, 'denim'],
  [/\b(navy|midnight|ink)\b/, 'navy'],
  [/\b(sage|mint|pistachio|seafoam)\b/, 'sage'],
  [/\b(olive|khaki|army|moss|military)\b/, 'olive'],
  [/\b(emerald|teal|jade)\b/, 'emerald'],
  [/\b(forest|bottle green|dark green|pine|green)\b/, 'forest'],
  [/\b(camel|caramel|cognac|toffee)\b/, 'camel'],
  [/\b(tan|taupe|mocha|latte|biscuit)\b/, 'tan'],
  [/\b(chocolate|brown|espresso|coffee|walnut|chestnut)\b/, 'chocolate'],
  [/\b(rust|terracotta|copper|burnt orange|brick|orange)\b/, 'rust'],
  [/\b(mustard|ochre|gold(en)?|yellow)\b/, 'mustard'],
  [/\b(lavender|lilac|mauve|purple|violet)\b/, 'lavender'],
  [/\b(dusty rose|dusty pink|rose)\b/, 'rose'],
  [/\b(blush|pink|pastel pink|ballet)\b/, 'pink'],
  [/\b(coral|salmon|peach|apricot)\b/, 'coral'],
  [/\b(burgundy|wine|oxblood|maroon|plum|bordeaux)\b/, 'burgundy'],
  [/\b(red|cherry|scarlet|crimson)\b/, 'red'],
  [/\b(charcoal|graphite|anthracite|dark grey|dark gray)\b/, 'charcoal'],
  [/\b(grey|gray|heather|silver|light grey|light gray)\b/, 'grey'],
  [/\b(black|jet|onyx|noir)\b/, 'black'],
  [/\b(white|optic|snow)\b/, 'white'],
  [/\bblue\b/, 'denim'],
];

export function colorFamilyOf(name: string): ColorFamily | null {
  const s = name.toLowerCase();
  for (const [re, fam] of COLOR_WORDS) if (re.test(s)) return fam;
  return null;
}

const CATEGORY_WORDS: [RegExp, Category][] = [
  [/\b(shoe|sneaker|trainer|boot|loafer|sandal|heel|pump|ballet flat|mule|clog|footwear)s?\b|\bflats\b/, 'Shoes'],
  [/\b(dress|dresses|skirt|skirts|gown|jumpsuit|playsuit)\b/, 'Dresses'],
  [/\b(jacket|coat|blazer|parka|bomber|trench|outerwear|gilet|vest jacket|overshirt|anorak|puffer)s?\b/, 'Jackets'],
  [/\b(trouser|trousers|pant|pants|jean|jeans|chino|chinos|shorts|legging|leggings|jogger|joggers)\b/, 'Trousers'],
  [/\b(bag|bags|tote|backpack|wallet|belt|hat|cap|beanie|scarf|scarves|jewel|jewellery|jewelry|earring|necklace|bracelet|ring|sunglasses|glove|gloves|watch|accessor(y|ies))\b/, 'Accessories'],
  [/\b(top|tops|shirt|shirts|t-shirt|tee|blouse|sweater|jumper|knit|knitwear|cardigan|hoodie|sweatshirt|polo|tank|camisole|bodysuit)s?\b/, 'Tops'],
];

/** Maps provider category text (and, failing that, the product name) onto an app category. */
export function categoryOf(...texts: (string | null | undefined)[]): Category | null {
  for (const t of texts) {
    if (!t) continue;
    const s = t.toLowerCase();
    for (const [re, cat] of CATEGORY_WORDS) if (re.test(s)) return cat;
  }
  return null;
}

export function genderOf(s: string | null | undefined): Gender | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (/\b(female|women|womens|women's|ladies)\b/.test(v)) return 'women';
  if (/\b(male|men|mens|men's)\b/.test(v)) return 'men';
  if (/\bunisex\b/.test(v)) return 'unisex';
  return null;
}

export function availabilityOf(s: string | null | undefined): Availability {
  if (!s) return 'unknown';
  const v = s.toLowerCase().replace(/[\s_-]/g, '');
  if (['instock', 'yes', 'true', '1', 'available', 'limitedavailability'].includes(v)) return 'in_stock';
  if (['outofstock', 'no', 'false', '0', 'soldout', 'discontinued', 'unavailable'].includes(v)) return 'out_of_stock';
  if (v === 'preorder') return 'preorder';
  if (v === 'backorder') return 'backorder';
  return 'unknown';
}

/** Only absolute http(s) URLs are accepted; anything else becomes null rather than a guess. */
export function safeUrl(s: string | null | undefined): string | null {
  if (!s) return null;
  try {
    const u = new URL(s.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Parses "49.99 USD", "USD 49.99", "49.99" (+ separate currency) into a price, or null. */
export function parsePrice(raw: string | number | null | undefined, currency?: string | null): Product['price'] {
  if (raw == null || raw === '') return null;
  let amount: number, cur = currency?.trim().toUpperCase() || '';
  if (typeof raw === 'number') amount = raw;
  else {
    const m = raw.trim().match(/^([A-Za-z]{3})?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*([A-Za-z]{3})?$/);
    if (!m) return null;
    amount = Number(m[2].replace(',', '.'));
    cur = (m[1] || m[3] || cur).toUpperCase();
  }
  if (!Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(cur)) return null;
  return { amount, currency: cur };
}

export function formatPrice(p: Product['price']): string | null {
  if (!p) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency, maximumFractionDigits: p.amount % 1 ? 2 : 0 }).format(p.amount);
  } catch {
    return `${p.amount} ${p.currency}`;
  }
}

/** A price/availability older than the provider's max age must not be shown as current. */
export const isPriceStale = (p: Product, info: Pick<ProviderInfo, 'priceMaxAgeMs'>, now = Date.now()) =>
  now - Date.parse(p.fetchedAt) > info.priceMaxAgeMs;
