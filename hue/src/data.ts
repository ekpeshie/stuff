// Placeholder catalogue. Every product, brand, retailer and URL here stands in for
// real product data, which must come from retailer feeds before launch.

export const FAM = {
  cream: ['Cream', '#E9DFC9'], ivory: ['Ivory', '#F2EEE4'], white: ['Optic white', '#F6F6F2'], camel: ['Camel', '#BE9468'], tan: ['Tan', '#B08560'],
  chocolate: ['Chocolate', '#5B3A29'], rust: ['Rust', '#A24E2B'], mustard: ['Mustard', '#C6962F'], olive: ['Olive', '#68663A'], sage: ['Sage', '#9AA488'],
  forest: ['Forest', '#2E4836'], emerald: ['Emerald', '#1E5A49'], navy: ['Navy', '#1E2943'], blue: ['Light blue', '#9DB4CF'], denim: ['Denim', '#475F80'],
  lavender: ['Lavender', '#B5ACC9'], rose: ['Dusty rose', '#C6929A'], pink: ['Blush', '#E8BFC4'], coral: ['Coral', '#D67A61'], burgundy: ['Burgundy', '#682233'],
  red: ['Cherry', '#A9282E'], charcoal: ['Charcoal', '#3A3A3C'], grey: ['Stone grey', '#A7A6A2'], black: ['Black', '#19191B'],
} as const satisfies Record<string, readonly [string, string]>;

export type Fam = keyof typeof FAM;
export type Cat = 'Tops' | 'Trousers' | 'Dresses' | 'Jackets' | 'Shoes' | 'Accessories' | 'Outfits';
export type Gender = 'W' | 'M' | 'U';

export interface Item {
  id: string;
  name: string;
  brand: string;
  cat: Cat;
  g: Gender;
  price: number | null;
  ratio: number;
  fams: Fam[];
  shot: string;
  tag: string | null;
  retailer: string;
  unavailable: boolean;
  url: string;
}

const RETAILERS = ['Northline', 'Mercer & Co.', 'The Edit Room', 'Atelier Hall', 'Fieldhouse'];

export const BRAND_STYLE: Record<string, string[]> = {
  'Norrow': ['Casual', 'Streetwear'], 'Oda Studio': ['Minimalist', 'Smart Casual'], 'Harbor Mill': ['Smart Casual', 'Formal', 'Minimalist'],
  'Mirelle': ['Trend-led', 'Formal'], 'Velde': ['Smart Casual', 'Formal'], 'Grain Supply': ['Casual'], 'Petra Lane': ['Smart Casual', 'Formal'],
  'Coast Theory': ['Streetwear', 'Casual'], 'Lumen Row': ['Smart Casual', 'Casual'], 'Sable & Pine': ['Minimalist', 'Casual'],
  'Hue Edit': ['Casual', 'Smart Casual', 'Minimalist', 'Streetwear', 'Formal', 'Trend-led'],
};

type Raw = [string, string, Cat, Gender, number | null, number, Fam[], string, string?];
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

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');

export const ITEMS: Item[] = RAW.map(([name, brand, cat, g, price, ratio, fams, shot, tag], i) => {
  const retailer = brand === 'Hue Edit' ? 'several stores' : RETAILERS[i % RETAILERS.length];
  return {
    id: 'p' + (i + 1), name, brand, cat, g, price, ratio, fams, shot, tag: tag || null, retailer,
    unavailable: i === 12 || i === 28,
    url: `https://example.com/${slug(retailer)}/${slug(name)}`,
  };
});

export interface Palette {
  name: string;
  blurb: string;
  rec: Fam[];
  neu: Fam[];
  acc: Fam[];
  alt: Fam[];
  combos: [Fam, Fam, Fam][];
}
export type PaletteKey = 'warmDeep' | 'warmLight' | 'coolLight' | 'coolDeep';

export const PALETTES: Record<PaletteKey, Palette> = {
  warmDeep: { name: 'Rich & warm', blurb: 'Earthy, saturated colors with warm undertones tend to look most natural on you.', rec: ['olive', 'rust', 'chocolate', 'mustard'], neu: ['cream', 'camel', 'tan'], acc: ['forest', 'burgundy', 'coral'], alt: ['denim', 'sage', 'ivory'], combos: [['cream', 'olive', 'chocolate'], ['rust', 'denim', 'cream'], ['camel', 'forest', 'ivory']] },
  warmLight: { name: 'Soft & warm', blurb: 'Light, gentle colors with a golden lean tend to look most natural on you.', rec: ['coral', 'sage', 'camel', 'cream'], neu: ['ivory', 'tan', 'grey'], acc: ['mustard', 'rose', 'blue'], alt: ['olive', 'denim', 'pink'], combos: [['ivory', 'coral', 'tan'], ['sage', 'cream', 'camel'], ['blue', 'ivory', 'tan']] },
  coolLight: { name: 'Soft & cool', blurb: 'Airy, muted colors with blue-pink undertones tend to look most natural on you.', rec: ['blue', 'rose', 'lavender', 'pink'], neu: ['white', 'navy', 'grey'], acc: ['emerald', 'burgundy', 'denim'], alt: ['sage', 'charcoal', 'ivory'], combos: [['navy', 'blue', 'white'], ['lavender', 'grey', 'white'], ['rose', 'navy', 'ivory']] },
  coolDeep: { name: 'Deep & cool', blurb: 'Clear, high-contrast colors with cool undertones tend to look most natural on you.', rec: ['navy', 'burgundy', 'emerald', 'red'], neu: ['charcoal', 'black', 'white'], acc: ['blue', 'lavender', 'pink'], alt: ['forest', 'denim', 'grey'], combos: [['burgundy', 'charcoal', 'black'], ['navy', 'blue', 'white'], ['emerald', 'black', 'white']] },
};

export const COMBO_NOTES = ['Grounded and easy for every day.', 'A sharper mix for work or dinner.', 'Quiet contrast with a lift.'];
export const STATUS = ['Getting your palette ready…', 'Exploring colors that complement your features…', 'Putting together your style recommendations…', 'Almost ready. Finding combinations for your look…'];
export const CATS: Cat[] = ['Tops', 'Trousers', 'Dresses', 'Jackets', 'Shoes', 'Accessories', 'Outfits'];
export const NAV_LABEL: Partial<Record<Cat, string>> = { Dresses: 'Dresses & skirts', Jackets: 'Outerwear' };
export const STYLES: [string, string, string][] = [
  ['Casual', '#B9A88C', 'jeans, tee, overshirt'], ['Smart Casual', '#3D4A5E', 'blazer, knit, loafer'], ['Minimalist', '#E2DDD3', 'clean lines, few colors'],
  ['Streetwear', '#4B4B45', 'hoodie, cargo, sneaker'], ['Formal', '#1F2230', 'tailoring, evening'], ['Trend-led', '#B9573E', "this season's shapes"],
];
export const DESC: Record<Cat, string> = {
  Tops: 'An easy layer with a considered cut — wears well alone or under a jacket.',
  Trousers: 'Cut to sit cleanly at the waist with a gentle drape through the leg.',
  Dresses: 'Moves well, and dresses up or down with a change of shoes.',
  Jackets: 'A hard-working outer layer with enough structure to sharpen simple outfits.',
  Shoes: 'Made to be worn often, with a sole that settles in after a few wears.',
  Accessories: 'A small finishing piece that ties an outfit together.',
  Outfits: 'A complete look assembled from pieces across several stores.',
};
export const SIZES: Record<Cat, string[]> = {
  Tops: ['XS', 'S', 'M', 'L', 'XL'], Trousers: ['26', '28', '30', '32', '34', '36'], Dresses: ['XS', 'S', 'M', 'L', 'XL'], Jackets: ['XS', 'S', 'M', 'L', 'XL'],
  Shoes: ['37', '38', '39', '40', '41', '42', '43', '44'], Accessories: [], Outfits: [],
};

export interface Prefs {
  styles: string[];
  budget: string;
  cats: Cat[];
  fit: string;
  shop: string;
}
export const DEFAULT_PREFS: Prefs = { styles: [], budget: 'No preference', cats: [], fit: 'No preference', shop: 'Both' };
