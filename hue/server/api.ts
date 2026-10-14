// HTTP API for the product feed. Mounted by the Vite dev/preview server and by
// server/index.ts in production.
//
//   GET /api/products?q=&category=&gender=&minPrice=&maxPrice=&colors=a,b&ids=x,y&sort=&cursor=&limit=
//   GET /api/products/:id      → re-checks one product's price and availability
//
// If the configured provider fails on a first page, list requests fall back to the sample
// catalogue and say so in `source.fallbackReason`, so sample products are never passed off
// as real inventory.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { isCategory, isColorFamily, type Gender, type ProductPage, type ProductQuery, type SortKey } from '../shared/product';
import { sampleProvider, type ProviderSetup } from './config';
import { ProviderError } from './providers/types';

const GENDERS: Gender[] = ['women', 'men', 'unisex'];
const SORTS: SortKey[] = ['relevance', 'price_asc', 'price_desc'];

function send(res: ServerResponse, status: number, body: unknown, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', cache);
  res.end(JSON.stringify(body));
}

export function parseQuery(sp: URLSearchParams): ProductQuery {
  const list = (k: string) => (sp.get(k) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const n = (k: string) => { const v = sp.get(k); return v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined; };
  const category = sp.get('category') || '';
  const gender = sp.get('gender') as Gender;
  const sort = sp.get('sort') as SortKey;
  return {
    q: (sp.get('q') || '').slice(0, 120) || undefined,
    category: isCategory(category) ? category : undefined,
    gender: GENDERS.includes(gender) ? gender : undefined,
    minPrice: n('minPrice'),
    maxPrice: n('maxPrice'),
    colors: list('colors').filter(isColorFamily).slice(0, 3),
    ids: sp.has('ids') ? list('ids').slice(0, 200) : undefined,
    sort: SORTS.includes(sort) ? sort : 'relevance',
    cursor: sp.get('cursor'),
    limit: n('limit'),
  };
}

export function createApiHandler(setup: ProviderSetup) {
  const live = setup.provider;

  // Cursors from the sample fallback are prefixed so later pages keep coming from the same
  // source: a provider that recovers mid-scroll never mixes live items into a sample feed.
  const SAMPLE_CURSOR = 'sample.';
  async function samplePage(q: ProductQuery, fallbackReason: string | undefined) {
    const r = await sampleProvider.search({ ...q, cursor: q.cursor?.slice(SAMPLE_CURSOR.length) });
    return { source: { ...sampleProvider.info(), fallbackReason }, ...r, nextCursor: r.nextCursor && SAMPLE_CURSOR + r.nextCursor } satisfies ProductPage;
  }

  async function list(sp: URLSearchParams, res: ServerResponse) {
    const q = parseQuery(sp);
    if (q.cursor?.startsWith(SAMPLE_CURSOR) || !live) {
      return send(res, 200, await samplePage(q, live ? 'The product provider was unavailable when you started browsing.' : setup.reason ?? undefined), 'private, max-age=300');
    }
    try {
      const r = await live.search(q);
      const body: ProductPage = { source: live.info(), ...r };
      // Short private cache: prices may change; the server cache handles provider load.
      return send(res, 200, body, 'private, max-age=60');
    } catch (e) {
      console.warn('[hue] provider failed:', e instanceof Error ? e.message : e);
      const reason = e instanceof ProviderError ? e.publicMessage : 'The product provider is unavailable right now.';
      // Mid-scroll failure of a live feed: report it so the client can retry, never fill with samples.
      if (q.cursor) return send(res, 503, { error: 'unavailable', message: reason });
      return send(res, 200, await samplePage(q, reason));
    }
  }

  async function one(id: string, res: ServerResponse) {
    const i = id.indexOf(':');
    const providerId = id.slice(0, i), externalId = id.slice(i + 1);
    const provider = providerId === 'sample' ? sampleProvider : live && live.info().id === providerId ? live : null;
    if (i < 1 || !provider) return send(res, 404, { error: 'not_found', message: 'This product is no longer listed.' });
    try {
      const p = await provider.get(externalId);
      if (!p) return send(res, 404, { error: 'not_found', message: 'This product is no longer listed.' });
      return send(res, 200, { source: provider.info(), product: p });
    } catch (e) {
      console.warn('[hue] product refresh failed:', e instanceof Error ? e.message : e);
      return send(res, 503, { error: 'unavailable', message: e instanceof ProviderError ? e.publicMessage : 'The product provider is unavailable right now.' });
    }
  }

  /** Connect-style middleware: handles /api/products*, passes everything else on. */
  return async (req: IncomingMessage, res: ServerResponse, next?: () => void) => {
    const url = new URL(req.url || '/', 'http://local');
    if (!url.pathname.startsWith('/api/')) return next ? next() : send(res, 404, { error: 'not_found' });
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
    try {
      if (url.pathname === '/api/products') return await list(url.searchParams, res);
      const m = url.pathname.match(/^\/api\/products\/(.+)$/);
      if (m) return await one(decodeURIComponent(m[1]), res);
      return send(res, 404, { error: 'not_found' });
    } catch (e) {
      console.error('[hue] api error', e);
      return send(res, 500, { error: 'server_error', message: 'Something went wrong loading products.' });
    }
  };
}
