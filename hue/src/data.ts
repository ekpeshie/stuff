// Palettes and UI constants. Product data comes from a provider via the product API
// (see server/ and src/products/), never from this file.

import { COLOR_FAMILIES, CATEGORIES, type Category, type ColorFamily } from '../shared/product';

export const FAM = COLOR_FAMILIES;
export type Fam = ColorFamily;
export type Cat = Category;
export const CATS = CATEGORIES;

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
export const NAV_LABEL: Partial<Record<Cat, string>> = { Dresses: 'Dresses & skirts', Jackets: 'Outerwear' };
export const STYLES: [string, string, string][] = [
  ['Casual', '#B9A88C', 'jeans, tee, overshirt'], ['Smart Casual', '#3D4A5E', 'blazer, knit, loafer'], ['Minimalist', '#E2DDD3', 'clean lines, few colors'],
  ['Streetwear', '#4B4B45', 'hoodie, cargo, sneaker'], ['Formal', '#1F2230', 'tailoring, evening'], ['Trend-led', '#B9573E', "this season's shapes"],
];

export interface Prefs {
  styles: string[];
  budget: string;
  cats: Cat[];
  fit: string;
  shop: string;
}
export const DEFAULT_PREFS: Prefs = { styles: [], budget: 'No preference', cats: [], fit: 'No preference', shop: 'Both' };
