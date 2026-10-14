// Generic provider for authorized product feeds: a retailer's own feed, or the feeds an
// affiliate network (Awin, impact.com, CJ, Rakuten…) issues to approved publishers.
// The feed is downloaded server-side, normalized, and held in memory. It is re-fetched on
// the configured schedule using conditional requests, and prices older than the provider's
// freshness limit are flagged so the UI stops presenting them as current.

import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import type { Product, ProviderInfo } from '../../shared/product';
import { queryProducts } from '../../shared/query';
import { parseDelimited } from '../feed/csv';
import { normalizeRows, type Field } from '../feed/normalize';
import { ProviderError, type ProductProvider } from './types';

export interface FeedConfig {
  id: string;
  label: string;
  /** https URL or local file path. May embed an API key, so it is never logged or returned. */
  source: string;
  format: 'auto' | 'csv' | 'json';
  /** Extra request headers, e.g. an Authorization header (from env, server-side only). */
  headers: Record<string, string>;
  imagePolicy: ProviderInfo['imagePolicy'];
  retailerName: string | null;
  refreshMs: number;
  priceMaxAgeMs: number;
  aliases?: Partial<Record<Field, string[]>>;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface Snapshot {
  products: Product[];
  byExternalId: Map<string, Product>;
  loadedAt: number;
  etag: string | null;
  lastModified: string | null;
}

const isUrl = (s: string) => /^https?:\/\//i.test(s);

export function createFeedProvider(cfg: FeedConfig): ProductProvider {
  const now = cfg.now ?? Date.now;
  const doFetch = cfg.fetchImpl ?? fetch;
  let snap: Snapshot | null = null;
  let inflight: Promise<Snapshot> | null = null;

  const info: ProviderInfo = {
    id: cfg.id,
    label: cfg.label,
    kind: 'live',
    imagePolicy: cfg.imagePolicy,
    priceMaxAgeMs: cfg.priceMaxAgeMs,
    sorts: ['relevance', 'price_asc', 'price_desc'],
  };

  async function download(prev: Snapshot | null): Promise<{ body: Buffer; type: string; etag: string | null; lastModified: string | null } | 'not-modified'> {
    if (!isUrl(cfg.source)) {
      const body = await readFile(cfg.source).catch((e: Error) => { throw new ProviderError('The product feed file could not be read.', e.message); });
      return { body, type: '', etag: null, lastModified: null };
    }
    const headers: Record<string, string> = { 'accept-encoding': 'gzip', ...cfg.headers };
    if (prev?.etag) headers['if-none-match'] = prev.etag;
    if (prev?.lastModified) headers['if-modified-since'] = prev.lastModified;
    let res: Response;
    try {
      res = await doFetch(cfg.source, { headers, signal: AbortSignal.timeout(60_000) });
    } catch (e) {
      throw new ProviderError('The product feed could not be reached.', (e as Error).message);
    }
    if (res.status === 304 && prev) return 'not-modified';
    if (!res.ok) throw new ProviderError(`The product feed returned an error (HTTP ${res.status}).`);
    return { body: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || '', etag: res.headers.get('etag'), lastModified: res.headers.get('last-modified') };
  }

  async function load(): Promise<Snapshot> {
    const prev = snap;
    const got = await download(prev);
    const t = now();
    if (got === 'not-modified') {
      // Unchanged upstream: the data is confirmed current as of now.
      const fetchedAt = new Date(t).toISOString();
      for (const p of prev!.products) p.fetchedAt = fetchedAt;
      return { ...prev!, loadedAt: t };
    }
    let body = got.body;
    if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body); // gzipped feed file
    const text = body.toString('utf8');
    const json = cfg.format === 'json' || (cfg.format === 'auto' && (/json/.test(got.type) || /^\s*[[{]/.test(text)));

    let rows: Record<string, string>[];
    try {
      if (json) {
        const data = JSON.parse(text);
        const arr: unknown[] = Array.isArray(data) ? data : data.items ?? data.products ?? data.Items ?? [];
        rows = arr.map((r) => Object.fromEntries(Object.entries(r as object).map(([k, v]) => [k.toLowerCase(), v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)])));
      } else rows = parseDelimited(text);
    } catch (e) {
      throw new ProviderError('The product feed could not be parsed.', (e as Error).message);
    }
    const products = normalizeRows(rows, {
      providerId: cfg.id, fetchedAt: new Date(t).toISOString(), allowImages: cfg.imagePolicy === 'direct',
      retailerName: cfg.retailerName, aliases: cfg.aliases,
    });
    if (!products.length) throw new ProviderError('The product feed contained no usable products.', `${rows.length} rows, none with an id and title`);
    return { products, byExternalId: new Map(products.map((p) => [p.externalId, p])), loadedAt: t, etag: got.etag, lastModified: got.lastModified };
  }

  function refresh() {
    inflight ??= load().then((s) => { snap = s; return s; }).finally(() => { inflight = null; });
    return inflight;
  }

  /** Stale-while-revalidate within the freshness limit; beyond it, wait for fresh data. */
  async function current(): Promise<Snapshot> {
    if (!snap) return refresh();
    const age = now() - snap.loadedAt;
    if (age > cfg.priceMaxAgeMs) {
      // Too old to show as current. If the refresh fails, serve the old data anyway — its
      // fetchedAt stays old, so the client hides prices and availability as unverified.
      return refresh().catch((e) => { console.warn('[feed] refresh failed:', (e as Error).message); return snap!; });
    }
    if (age > cfg.refreshMs) refresh().catch((e) => console.warn('[feed] background refresh failed:', (e as Error).message));
    return snap;
  }

  return {
    info: () => info,
    search: async (q) => queryProducts((await current()).products, q),
    get: async (externalId) => (await current()).byExternalId.get(externalId) ?? null,
  };
}
