// SAMPLE DATA — illustrative only.
// These products, brands and prices are invented for design and demo purposes. They are
// flagged `isSample: true`, carry no retailer links, and the UI labels them as samples.
// They are shown only when no real product provider is configured or reachable.

import type { Category, ColorFamily, Gender, Product, ProviderInfo } from './product';

export const SAMPLE_PROVIDER: ProviderInfo = {
  id: 'sample',
  label: 'Sample products',
  kind: 'sample',
  imagePolicy: 'none',
  priceMaxAgeMs: Number.MAX_SAFE_INTEGER, // samples never go stale (JSON can't carry Infinity)
  sorts: ['relevance', 'price_asc', 'price_desc'],
};

/** Style tags for the invented sample brands (real products derive style from keywords instead). */
const BRAND_STYLE: Record<string, string[]> = {
  'Norrow': ['Casual', 'Streetwear'], 'Oda Studio': ['Minimalist', 'Smart Casual'], 'Harbor Mill': ['Smart Casual', 'Formal', 'Minimalist'],
  'Mirelle': ['Trend-led', 'Formal'], 'Velde': ['Smart Casual', 'Formal'], 'Grain Supply': ['Casual'], 'Petra Lane': ['Smart Casual', 'Formal'],
  'Coast Theory': ['Streetwear', 'Casual'], 'Lumen Row': ['Smart Casual', 'Casual'], 'Sable & Pine': ['Minimalist', 'Casual'],
  'Hue Edit': ['Casual', 'Smart Casual', 'Minimalist', 'Streetwear', 'Formal', 'Trend-led'],
};

const SIZES: Record<Category, string[] | null> = {
  Tops: ['XS', 'S', 'M', 'L', 'XL'], Trousers: ['26', '28', '30', '32', '34', '36'], Dresses: ['XS', 'S', 'M', 'L', 'XL'], Jackets: ['XS', 'S', 'M', 'L', 'XL'],
  Shoes: ['37', '38', '39', '40', '41', '42', '43', '44'], Accessories: null, Outfits: null,
};

const DESC: Record<Category, string> = {
  Tops: 'An easy layer with a considered cut — wears well alone or under a jacket.',
  Trousers: 'Cut to sit cleanly at the waist with a gentle drape through the leg.',
  Dresses: 'Moves well, and dresses up or down with a change of shoes.',
  Jackets: 'A hard-working outer layer with enough structure to sharpen simple outfits.',
  Shoes: 'Made to be worn often, with a sole that settles in after a few wears.',
  Accessories: 'A small finishing piece that ties an outfit together.',
  Outfits: 'A complete look assembled from several pieces.',
};

const NAMES: Record<ColorFamily, string> = {
  cream: 'Cream', ivory: 'Ivory', white: 'Optic white', camel: 'Camel', tan: 'Tan', chocolate: 'Chocolate', rust: 'Rust', mustard: 'Mustard',
  olive: 'Olive', sage: 'Sage', forest: 'Forest', emerald: 'Emerald', navy: 'Navy', blue: 'Light blue', denim: 'Denim', lavender: 'Lavender',
  rose: 'Dusty rose', pink: 'Blush', coral: 'Coral', burgundy: 'Burgundy', red: 'Cherry', charcoal: 'Charcoal', grey: 'Stone grey', black: 'Black',
};

type Raw = [string, string, Category, 'W' | 'M' | 'U', number | null, number, ColorFamily[], string, string?];
const RAW: Raw[] = [
  ['Relaxed wool overshirt', 'Norrow', 'Jackets', 'U', 148, 1.35, ['olive', 'cream'], 'model in overshirt over white tee, outdoor light', 'Trending'],
  ['Pleated wide-leg trouser', 'Oda Studio', 'Trousers', 'W', 120, 1.5, ['cream', 'camel'], 'full length, studio, mid-step'],
  ['Ribbed merino crew', 'Harbor Mill', 'Tops', 'M', 89, 1.0, ['rust', 'navy', 'cream'], 'flat lay, knit texture'],
  ['Silk slip midi dress', 'Mirelle', 'Dresses', 'W', 210, 1.6, ['chocolate', 'emerald', 'black'], 'model, late evening light'],
  ['Leather penny loafer', 'Velde', 'Shoes', 'U', 185, 0.8, ['chocolate', 'black'], 'pair on stone step'],
  ['Canvas tote, large', 'Grain Supply', 'Accessories', 'U', 45, 1.1, ['cream', 'olive'], 'tote on shoulder, street'],
  ['Double-breasted wool coat', 'Petra Lane', 'Jackets', 'W', 320, 1.55, ['camel'], 'model walking, city crossing', 'New'],
  ['Selvedge straight jean', 'Coast Theory', 'Trousers', 'M', 135, 1.4, ['denim'], 'detail, cuffed hem'],
  ['Oxford button-down', 'Lumen Row', 'Tops', 'M', 78, 1.25, ['blue', 'white'], 'model, sleeves rolled'],
  ['Cropped boxy cardigan', 'Sable & Pine', 'Tops', 'W', 96, 1.1, ['sage', 'cream', 'lavender'], 'model seated, window'],
  ['Weekend look: olive + cream', 'Hue Edit', 'Outfits', 'U', null, 1.7, ['olive', 'cream', 'chocolate'], 'full outfit, editorial, park'],
  ['Suede chelsea boot', 'Velde', 'Shoes', 'M', 230, 1.0, ['tan', 'chocolate'], 'pair, side profile'],
  ['Satin midi skirt', 'Mirelle', 'Dresses', 'W', 115, 1.45, ['burgundy', 'olive'], 'motion blur, walking'],
  ['Heavyweight hoodie', 'Coast Theory', 'Tops', 'U', 92, 1.2, ['grey', 'forest', 'black'], 'model, street, overcast'],
  ['Quilted liner jacket', 'Norrow', 'Jackets', 'M', 165, 1.3, ['navy', 'olive'], 'hanging product shot'],
  ['Linen camp-collar shirt', 'Lumen Row', 'Tops', 'M', 72, 1.3, ['rust', 'cream'], 'model against sunlit wall', 'New'],
  ['Gold hoop earrings', 'Oda Studio', 'Accessories', 'W', 58, 0.85, ['mustard'], 'macro, jewellery on linen'],
  ['Tailored wool trouser', 'Harbor Mill', 'Trousers', 'M', 140, 1.5, ['charcoal', 'black'], 'model, mid-stride'],
  ['Wrap knit dress', 'Petra Lane', 'Dresses', 'W', 175, 1.6, ['coral', 'burgundy'], 'model, studio backdrop'],
  ['Classic trench coat', 'Sable & Pine', 'Jackets', 'U', 280, 1.65, ['tan', 'navy'], 'model, rain-wet street', 'Trending'],
  ['Retro court sneaker', 'Coast Theory', 'Shoes', 'U', 110, 0.8, ['white', 'forest'], 'pair from above'],
  ['Cashmere scarf', 'Harbor Mill', 'Accessories', 'U', 125, 1.2, ['camel', 'grey', 'burgundy'], 'folded, close texture'],
  ['Smart casual: navy + light blue', 'Hue Edit', 'Outfits', 'M', null, 1.6, ['navy', 'blue', 'white'], 'full outfit, office stairwell'],
  ['Mock-neck fine knit', 'Oda Studio', 'Tops', 'W', 85, 1.15, ['black', 'ivory', 'rose'], 'model, close crop'],
  ['Parachute cargo pant', 'Coast Theory', 'Trousers', 'U', 98, 1.45, ['olive', 'black'], 'model, skate park'],
  ['Leather crossbody', 'Velde', 'Accessories', 'W', 195, 0.9, ['chocolate', 'burgundy', 'black'], 'bag on café table'],
  ['Corduroy chore jacket', 'Grain Supply', 'Jackets', 'M', 138, 1.25, ['rust', 'chocolate'], 'flat lay, workwear'],
  ['Puff-sleeve poplin blouse', 'Mirelle', 'Tops', 'W', 88, 1.35, ['white', 'pink'], 'model, window light'],
  ['Mary Jane flat', 'Petra Lane', 'Shoes', 'W', 130, 0.85, ['burgundy', 'black'], 'pair on tiled floor'],
  ['Evening: burgundy + charcoal', 'Hue Edit', 'Outfits', 'W', null, 1.7, ['burgundy', 'charcoal', 'black'], 'full outfit, night street'],
  ['Nylon bomber jacket', 'Norrow', 'Jackets', 'U', 190, 1.2, ['forest', 'black'], 'model, three-quarter turn'],
  ['Pleated tennis skirt', 'Lumen Row', 'Dresses', 'W', 68, 1.1, ['grey', 'navy'], 'model on court'],
  ['Wide-brim felt hat', 'Grain Supply', 'Accessories', 'U', 75, 0.9, ['chocolate', 'camel'], 'product from above'],
  ['Relaxed linen trouser', 'Sable & Pine', 'Trousers', 'U', 95, 1.5, ['sage', 'cream'], 'model, coastal path'],
  ['Striped breton top', 'Harbor Mill', 'Tops', 'U', 60, 1.2, ['navy', 'cream'], 'model, harbour wall'],
  ['Shearling-lined clog', 'Velde', 'Shoes', 'U', 145, 0.8, ['tan', 'grey'], 'pair on wool rug'],
  ['Cable knit vest', 'Oda Studio', 'Tops', 'U', 79, 1.1, ['lavender', 'grey'], 'model, layered over shirt'],
  ['Denim chore coat', 'Coast Theory', 'Jackets', 'U', 150, 1.35, ['denim'], 'model in workshop'],
  ['Rib beanie', 'Grain Supply', 'Accessories', 'U', 32, 0.9, ['mustard', 'forest'], 'product on bench'],
  ['Column maxi dress', 'Petra Lane', 'Dresses', 'W', 195, 1.75, ['emerald', 'navy'], 'model, gallery space'],
];

const GENDER: Record<Raw[3], Gender> = { W: 'women', M: 'men', U: 'unisex' };
const FETCHED_AT = '2026-01-01T00:00:00.000Z';

export const SAMPLE_PRODUCTS: Product[] = RAW.map(([name, brand, cat, g, price, ratio, fams, shot, tag], i) => ({
  id: `sample:s${i + 1}`,
  providerId: 'sample',
  externalId: `s${i + 1}`,
  isSample: true,
  name,
  brand,
  price: price == null ? null : { amount: price, currency: 'USD' },
  imageUrl: null,
  retailer: { name: null, productUrl: null },
  category: cat,
  rawCategory: cat,
  colors: fams.map((f) => ({ name: NAMES[f], family: f })),
  sizes: SIZES[cat],
  gender: GENDER[g],
  // Two samples demonstrate the unavailable state.
  availability: i === 12 || i === 28 ? 'out_of_stock' : 'in_stock',
  description: DESC[cat],
  fetchedAt: FETCHED_AT,
  sample: { shot, ratio, tag: tag || null, styles: BRAND_STYLE[brand] || [] },
}));
