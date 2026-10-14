import { DEFAULT_PREFS, FAM, type Fam, type Palette, type PaletteKey, type Prefs } from './data';
import { formatPrice, isPriceStale, type Product, type ProviderInfo } from '../shared/product';

export const hexOf = (f: Fam) => FAM[f][1];
export const fname = (f: Fam) => FAM[f][0];

const lum = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

export interface Tone { bg: string; fg: string; stripe: string }
export const tone = (hex: string): Tone => {
  const dark = lum(hex) < 0.55;
  return { bg: hex, fg: dark ? '#f7f5f1' : '#1f1d1a', stripe: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' };
};

/** Striped placeholder background standing in for product photography. */
export const placeholderBg = (t: Tone) => ({
  backgroundColor: t.bg,
  backgroundImage: `repeating-linear-gradient(135deg,${t.stripe} 0 1px,transparent 1px 10px)`,
});

/** Budget bands. Thresholds are in the listing's own currency units — a rough guide only. */
export const inBudget = (p: Product, b: string) => {
  const v = p.price?.amount;
  if (v == null) return true;
  return b === 'Affordable' ? v < 90 : b === 'Mid-range' ? v >= 90 && v <= 180 : b === 'Premium' ? v > 180 : true;
};

// Style and fit signals from product text, so real products (whose brands we know nothing
// about) can be matched to the preferences too. Sample products carry explicit style tags.
const STYLE_WORDS: Record<string, RegExp> = {
  'Casual': /\b(tee|t-shirt|jeans?|denim|sweatshirt|hoodie|overshirt|chinos?|sneakers?|canvas|linen)\b/,
  'Smart Casual': /\b(oxford|knit|merino|cardigan|loafers?|chinos?|polo|blazer|button-down)\b/,
  'Streetwear': /\b(hoodie|cargo|bomber|sneakers?|trainers?|track|oversized|graphic|beanie|parachute)\b/,
  'Formal': /\b(tailored|suit|blazer|dress shirt|wool trousers?|derby|heels?|gown|silk|evening)\b/,
  'Trend-led': /\b(satin|metallic|crochet|sheer|cropped|platform|statement|puff|slip)\b/,
};
const NEUTRALS: Fam[] = ['cream', 'ivory', 'white', 'black', 'grey', 'charcoal', 'navy', 'camel', 'tan'];
const FIT_WORDS: Record<string, RegExp> = {
  Relaxed: /\b(relaxed|oversized|wide|loose|boxy|baggy)\b/,
  Regular: /\b(regular|straight|classic)\b/,
  Tailored: /\b(tailored|slim|fitted|skinny)\b/,
};

function matchesStyle(p: Product, style: string) {
  if (p.sample) return p.sample.styles.includes(style);
  const text = `${p.name} ${p.rawCategory ?? ''}`.toLowerCase();
  if (style === 'Minimalist') return p.colors.length > 0 && p.colors.every((c) => c.family && NEUTRALS.includes(c.family));
  return STYLE_WORDS[style]?.test(text) ?? false;
}

/**
 * Local ranking for the personalized feed: estimated color compatibility plus the user's
 * preferences. Runs in the browser; nothing about the photo or palette is sent anywhere.
 * Products with unknown colors score neutrally on color rather than being guessed at.
 */
export function score(p: Product, pal: Palette, prefs: Prefs) {
  let s = 0;
  p.colors.forEach(({ family: f }, j) => {
    if (!f) return;
    if (pal.rec.includes(f)) s += j ? 2 : 4;
    else if (pal.neu.includes(f)) s += j ? 1.5 : 3;
    else if (pal.acc.includes(f)) s += j ? 1 : 2.5;
    else if (pal.alt.includes(f)) s += j ? 0.5 : 1;
  });
  if (prefs.cats.length && p.category) {
    if (prefs.cats.includes(p.category)) s += 2;
    else if (p.category !== 'Outfits') s -= 3;
  }
  if (prefs.budget !== 'No preference' && p.price) s += inBudget(p, prefs.budget) ? 1.5 : -2.5;
  if (prefs.styles.some((st) => matchesStyle(p, st))) s += 1.5;
  if (prefs.fit !== 'No preference' && FIT_WORDS[prefs.fit]?.test(p.name.toLowerCase())) s += 1;
  if (prefs.shop === 'Complete outfits') s += p.category === 'Outfits' ? 4 : -0.5;
  if (prefs.shop === 'Individual pieces' && p.category === 'Outfits') s -= 4;
  if (p.availability === 'out_of_stock') s -= 10; // available pieces first
  return s;
}

/** Stable sort by score, best first. */
export const rankProducts = (items: Product[], pal: Palette, prefs: Prefs) =>
  items.map((p, i) => ({ p, i, s: score(p, pal, prefs) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.p);

/** A short styling reason — only when the product's color is actually known. */
export function reasonFor(p: Product, pal: Palette) {
  const f = p.colors[0]?.family;
  const firstNeutral = fname(pal.neu[0]).toLowerCase();
  if (p.category === 'Outfits') return 'A ready-made combination drawn from your palette.';
  if (!f) return '';
  if (pal.rec.includes(f)) return `Try this ${fname(f).toLowerCase()} shade with ${firstNeutral} or dark denim.`;
  if (pal.neu.includes(f)) return 'A versatile neutral for your everyday wardrobe.';
  if (pal.acc.includes(f)) return 'An accent that pairs well with your selected palette.';
  if (pal.alt.includes(f)) return `Something to experiment with — keep ${firstNeutral} close by.`;
  return '';
}

/** Placeholder tone for a product without a displayable image. */
export const productTone = (p: Product, colorIndex = 0) => tone(p.colors[colorIndex]?.family ? FAM[p.colors[colorIndex].family!][1] : '#D9D2C6');

const DEFAULT_RATIO: Record<string, number> = { Tops: 1.25, Trousers: 1.4, Dresses: 1.5, Jackets: 1.3, Shoes: 0.95, Accessories: 1.0, Outfits: 1.6 };
/** Height/width ratio for masonry: the sample's art ratio, or a category default with slight, stable variation. */
export function productRatio(p: Product) {
  if (p.sample) return p.sample.ratio;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (DEFAULT_RATIO[p.category ?? ''] ?? 1.25) + ((Math.abs(h) % 5) - 2) * 0.05;
}

/** What to show as the price. Never presents a missing or stale price as current. */
export function priceLabel(p: Product, info: ProviderInfo | null): string {
  if (p.category === 'Outfits' && !p.price) return 'Shop the look';
  if (!p.price) return 'Price at retailer';
  if (!p.isSample && info && isPriceStale(p, info)) return 'Check price at retailer';
  return formatPrice(p.price) ?? 'Price at retailer';
}

export const isSoldOut = (p: Product) => p.availability === 'out_of_stock';

export interface Analysis { key: PaletteKey; hex: string | null }

/**
 * Estimates a starting palette entirely in the browser: downsample the photo onto a
 * canvas, average the central (roughly face) region, and classify warm/cool and
 * light/deep. A rough heuristic — the UI presents the result as an estimate.
 */
export function analyzePhoto(url: string | null): Promise<Analysis | null> {
  return new Promise((res) => {
    if (!url) return res(null);
    const img = new Image();
    img.onload = () => {
      try {
        const w = 80, h = Math.max(1, Math.round((80 * img.height) / img.width));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        if (!x) return res(null);
        x.drawImage(img, 0, 0, w, h);
        const d = x.getImageData(Math.floor(w * 0.35), Math.floor(h * 0.22), Math.max(1, Math.floor(w * 0.3)), Math.max(1, Math.floor(h * 0.3))).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          if (mx < 35 || mn > 240) continue;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
        if (!n) return res(null);
        r /= n; g /= n; b /= n;
        const warm = r - b > 48, light = 0.299 * r + 0.587 * g + 0.114 * b > 150;
        const hex = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
        res({ key: warm ? (light ? 'warmLight' : 'warmDeep') : light ? 'coolLight' : 'coolDeep', hex });
      } catch {
        res(null);
      }
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

// Only preferences, the palette estimate and saved items are persisted — never the photo.
const STORE_KEY = 'hue.v1';
export interface Stored { saved: string[]; prefs: Prefs; personalized: boolean; paletteKey: PaletteKey; sampleHex: string | null }

export function loadStored(): Stored {
  let sv: Partial<Stored> = {};
  try { sv = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { /* storage unavailable */ }
  return {
    saved: Array.isArray(sv.saved) ? sv.saved : [],
    prefs: sv.prefs ? { ...DEFAULT_PREFS, ...sv.prefs } : { ...DEFAULT_PREFS },
    personalized: !!sv.personalized,
    paletteKey: sv.paletteKey || 'warmDeep',
    sampleHex: sv.sampleHex || null,
  };
}

export function saveStored(v: Partial<Stored>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ }
}
