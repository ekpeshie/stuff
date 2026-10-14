// Chooses the product provider from environment variables. Credentials and feed URLs are
// read here, on the server, and never sent to the browser. See README "Product data".

import { existsSync } from 'node:fs';
import { createFeedProvider } from './providers/feed';
import { createSampleProvider } from './providers/sample';
import type { ProductProvider } from './providers/types';

export interface ProviderSetup {
  provider: ProductProvider | null;
  /** Why no live provider is active, shown with the sample products. */
  reason: string | null;
}

const MIN = 60_000;
const num = (v: string | undefined, fallback: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);

function header(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const i = raw.indexOf(':');
  return i > 0 ? { [raw.slice(0, i).trim()]: raw.slice(i + 1).trim() } : {};
}

export function loadEnvFile() {
  if (existsSync('.env')) process.loadEnvFile('.env');
}

export function createProviderFromEnv(env: NodeJS.ProcessEnv = process.env): ProviderSetup {
  const kind = (env.PRODUCT_PROVIDER || '').trim().toLowerCase();

  if (!kind || kind === 'sample') {
    return { provider: null, reason: 'No product provider is connected yet.' };
  }

  if (kind === 'feed') {
    if (!env.FEED_URL) return { provider: null, reason: 'The product feed is not configured.' };
    const imagePolicy = env.FEED_IMAGE_POLICY === 'direct' ? 'direct' : 'none';
    if (imagePolicy === 'none') {
      console.warn('[hue] FEED_IMAGE_POLICY is not "direct": product images are hidden. Set it only if the feed terms allow displaying the image URLs.');
    }
    let aliases;
    try {
      aliases = env.FEED_COLUMN_MAP ? JSON.parse(env.FEED_COLUMN_MAP) : undefined;
    } catch {
      console.warn('[hue] FEED_COLUMN_MAP is not valid JSON; ignoring it.');
    }
    const refreshMs = num(env.FEED_REFRESH_MINUTES, 360) * MIN;
    return {
      provider: createFeedProvider({
        id: 'feed',
        label: env.FEED_LABEL || 'Product feed',
        source: env.FEED_URL,
        format: env.FEED_FORMAT === 'csv' || env.FEED_FORMAT === 'json' ? env.FEED_FORMAT : 'auto',
        headers: header(env.FEED_AUTH_HEADER),
        imagePolicy,
        retailerName: env.FEED_RETAILER_NAME || null,
        refreshMs,
        priceMaxAgeMs: Math.max(refreshMs, num(env.FEED_PRICE_MAX_AGE_MINUTES, 1440) * MIN),
        aliases,
      }),
      reason: null,
    };
  }

  return { provider: null, reason: `Unknown product provider "${kind}".` };
}

export const sampleProvider = createSampleProvider();
