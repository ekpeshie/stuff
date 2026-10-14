import { BRAND_STYLE, DEFAULT_PREFS, FAM, type Fam, type Item, type Palette, type PaletteKey, type Prefs } from './data';

export const hexOf = (f: Fam) => FAM[f][1];
export const fname = (f: Fam) => FAM[f][0];
export const money = (n: number) => '$' + n;

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

export const inBudget = (it: Item, b: string) =>
  it.price == null ? true
    : b === 'Affordable' || b === 'Under $90' ? it.price < 90
    : b === 'Mid-range' || b === '$90–180' ? it.price >= 90 && it.price <= 180
    : b === 'Premium' || b === '$180+' ? it.price > 180
    : true;

/** Deterministic shuffle so each "page" of the endless feed is stable across renders. */
export const shuffle = <T,>(arr: T[], seed: number): T[] => {
  const a = arr.slice();
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function score(it: Item, pal: Palette, prefs: Prefs) {
  let s = 0;
  it.fams.forEach((f, j) => {
    if (pal.rec.includes(f)) s += j ? 2 : 4;
    else if (pal.neu.includes(f)) s += j ? 1.5 : 3;
    else if (pal.acc.includes(f)) s += j ? 1 : 2.5;
    else if (pal.alt.includes(f)) s += j ? 0.5 : 1;
  });
  if (prefs.cats.length) {
    if (prefs.cats.includes(it.cat)) s += 2;
    else if (it.cat !== 'Outfits') s -= 3;
  }
  if (prefs.budget !== 'No preference' && it.price != null) s += inBudget(it, prefs.budget) ? 1.5 : -2.5;
  if (prefs.styles.length && (BRAND_STYLE[it.brand] || []).some((x) => prefs.styles.includes(x))) s += 1.5;
  if (prefs.shop === 'Complete outfits') s += it.cat === 'Outfits' ? 4 : -0.5;
  if (prefs.shop === 'Individual pieces' && it.cat === 'Outfits') s -= 4;
  return s;
}

export function reasonFor(it: Item, pal: Palette) {
  const f = it.fams[0];
  const firstNeutral = fname(pal.neu[0]).toLowerCase();
  if (it.cat === 'Outfits') return 'A ready-made combination drawn from your palette.';
  if (pal.rec.includes(f)) return `Try this ${fname(f).toLowerCase()} shade with ${firstNeutral} or dark denim.`;
  if (pal.neu.includes(f)) return 'A versatile neutral for your everyday wardrobe.';
  if (pal.acc.includes(f)) return 'A warm accent that pairs well with your selected palette.';
  return `Something to experiment with — keep ${firstNeutral} close by.`;
}

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
