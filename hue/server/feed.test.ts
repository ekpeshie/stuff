// Test fixtures use example.test URLs and made-up rows: they exercise parsing only and are
// never served by the app.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';
import { parseDelimited } from './feed/csv';
import { normalizeRows } from './feed/normalize';
import { createFeedProvider, type FeedConfig } from './providers/feed';
import { createApiHandler, parseQuery } from './api';
import type { ProviderError } from './providers/types';
import { categoryOf, colorFamilyOf, parsePrice } from '../shared/product';

const GOOGLE_TSV = [
  'id\titem_group_id\ttitle\tbrand\tprice\tsale_price\tlink\timage_link\tavailability\tcolor\tsize\tgender\tproduct_type',
  'A1-S\tA1\tLinen camp shirt\tTestbrand\t60.00 USD\t\thttps://shop.example.test/a1\thttps://img.example.test/a1.jpg\tin_stock\tWashed Olive\tS\tmale\tApparel > Shirts',
  'A1-M\tA1\tLinen camp shirt\tTestbrand\t60.00 USD\t\thttps://shop.example.test/a1\thttps://img.example.test/a1.jpg\tout_of_stock\tCream\tM\tmale\tApparel > Shirts',
  'B2\t\tWide-leg trouser\t\t\t\tjavascript:alert(1)\t\tout of stock\tNavy\t\tfemale\tWomen > Trousers',
  '\t\tNo id row\tX\t10 USD\t\t\t\t\t\t\t\t',
].join('\n');

const AWIN_CSV = 'aw_product_id,product_name,brand_name,search_price,currency,aw_deep_link,merchant_deep_link,merchant_image_url,in_stock,colour,merchant_name,merchant_category\n' +
  '901,"Chelsea boot, suede",Bootco,129.5,GBP,https://www.awin1.example.test/t?p=901,https://bootco.example.test/901,https://img.example.test/901.jpg,1,Tan,Bootco UK,Footwear';

const opts = { providerId: 'feed', fetchedAt: '2026-10-14T00:00:00.000Z', allowImages: true, retailerName: 'Fallback Store' };

test('parses quoted CSV with commas and detects tabs', () => {
  const rows = parseDelimited(AWIN_CSV);
  assert.equal(rows[0].product_name, 'Chelsea boot, suede');
  assert.equal(parseDelimited(GOOGLE_TSV).length, 4);
});

test('normalizes Google-format rows, merges variants, never invents fields', () => {
  const [shirt, trouser, ...rest] = normalizeRows(parseDelimited(GOOGLE_TSV), opts);
  assert.equal(rest.length, 0, 'row without an id is dropped');
  assert.equal(shirt.id, 'feed:A1-S');
  assert.deepEqual(shirt.price, { amount: 60, currency: 'USD' });
  assert.deepEqual(shirt.colors.map((c) => c.family), ['olive', 'cream']);
  assert.deepEqual(shirt.sizes, ['S', 'M']);
  assert.equal(shirt.availability, 'in_stock', 'any in-stock variant makes the product available');
  assert.equal(shirt.category, 'Tops');
  assert.equal(shirt.gender, 'men');
  assert.equal(shirt.retailer.name, 'Fallback Store');

  assert.equal(trouser.brand, null, 'missing brand stays null');
  assert.equal(trouser.price, null, 'missing price stays null');
  assert.equal(trouser.retailer.productUrl, null, 'non-http link is rejected');
  assert.equal(trouser.imageUrl, null);
  assert.equal(trouser.availability, 'out_of_stock');
  assert.equal(trouser.category, 'Trousers');
});

test('normalizes Awin-style columns and prefers the tracked deep link', () => {
  const [boot] = normalizeRows(parseDelimited(AWIN_CSV), opts);
  assert.equal(boot.retailer.productUrl, 'https://www.awin1.example.test/t?p=901');
  assert.equal(boot.retailer.name, 'Bootco UK');
  assert.deepEqual(boot.price, { amount: 129.5, currency: 'GBP' });
  assert.equal(boot.category, 'Shoes');
  assert.equal(boot.availability, 'in_stock');
});

test('images are dropped unless the image policy allows them', () => {
  const [boot] = normalizeRows(parseDelimited(AWIN_CSV), { ...opts, allowImages: false });
  assert.equal(boot.imageUrl, null);
});

test('helpers', () => {
  assert.equal(parsePrice('abc'), null);
  assert.equal(parsePrice('12.00'), null, 'no currency means no price');
  assert.deepEqual(parsePrice('EUR 12,50'), { amount: 12.5, currency: 'EUR' });
  assert.equal(colorFamilyOf('Light Blue'), 'blue');
  assert.equal(colorFamilyOf('Multicolour'), null);
  assert.equal(categoryOf('Short sleeve shirt'), 'Tops');
});

function fakeFetch(responses: (() => Response)[]) {
  const calls: RequestInit[] = [];
  const impl = (async (_url: string, init: RequestInit) => { calls.push(init); const r = responses.shift(); if (!r) throw new Error('offline'); return r(); }) as unknown as typeof fetch;
  return { impl, calls };
}

const cfg = (over: Partial<FeedConfig>): FeedConfig => ({
  id: 'feed', label: 'Test feed', source: 'https://feeds.example.test/f.csv?apikey=SECRET', format: 'auto', headers: {}, imagePolicy: 'direct',
  retailerName: null, refreshMs: 60_000, priceMaxAgeMs: 120_000, ...over,
});

test('feed provider: gzip download, search, conditional refresh, stale handling', async () => {
  let t = 1_000_000;
  const f = fakeFetch([
    () => new Response(gzipSync(Buffer.from(GOOGLE_TSV)), { headers: { etag: '"v1"' } }),
    () => new Response(null, { status: 304 }),
  ]);
  const p = createFeedProvider(cfg({ fetchImpl: f.impl, now: () => t }));
  const page = await p.search({ q: 'linen' });
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].fetchedAt, new Date(1_000_000).toISOString());

  t += 150_000; // past max age → waits for refresh; 304 confirms data as current
  const again = await p.search({});
  assert.equal(f.calls[1].headers && (f.calls[1].headers as Record<string, string>)['if-none-match'], '"v1"');
  assert.equal(again.items[0].fetchedAt, new Date(t).toISOString());

  t += 150_000; // refresh fails → old snapshot served, fetchedAt left old so the UI hides prices
  const stale = await p.search({});
  assert.equal(stale.items[0].fetchedAt, new Date(t - 150_000).toISOString());
});

test('feed provider: first load failure raises a public, secret-free error', async () => {
  const p = createFeedProvider(cfg({ fetchImpl: fakeFetch([() => new Response('nope', { status: 401 })]).impl }));
  await assert.rejects(p.search({}), (e: ProviderError) => {
    assert.match(e.publicMessage, /HTTP 401/);
    assert.doesNotMatch(e.publicMessage, /SECRET|example\.test/);
    return true;
  });
});

async function call(handler: ReturnType<typeof createApiHandler>, url: string) {
  let status = 0, body = '';
  const res = { statusCode: 0, setHeader() {}, end(b: string) { status = this.statusCode; body = b; } };
  await handler({ url, method: 'GET' } as never, res as never);
  return { status, json: JSON.parse(body) };
}

test('api: falls back to labelled sample products when the provider fails', async () => {
  const broken = createFeedProvider(cfg({ fetchImpl: fakeFetch([]).impl }));
  const api = createApiHandler({ provider: broken, reason: null });
  const { status, json } = await call(api, '/api/products?limit=5');
  assert.equal(status, 200);
  assert.equal(json.source.kind, 'sample');
  assert.match(json.source.fallbackReason, /could not be reached/);
  assert.ok(json.items.every((p: { isSample: boolean }) => p.isSample));
});

test('api: serves live products and 404s products no longer listed', async () => {
  const p = createFeedProvider(cfg({ fetchImpl: fakeFetch([() => new Response(AWIN_CSV)]).impl }));
  const api = createApiHandler({ provider: p, reason: null });
  const list = await call(api, '/api/products?category=Shoes');
  assert.equal(list.json.source.kind, 'live');
  assert.equal(list.json.items[0].id, 'feed:901');
  assert.equal((await call(api, '/api/products/feed%3A901')).status, 200);
  assert.equal((await call(api, '/api/products/feed%3Agone')).status, 404);
  assert.equal((await call(api, '/api/products/sample%3As1')).json.product.isSample, true);
});

test('parseQuery validates input', () => {
  const q = parseQuery(new URLSearchParams('category=Hats&gender=x&colors=olive,neon,navy&sort=bogus&limit=5'));
  assert.equal(q.category, undefined);
  assert.equal(q.gender, undefined);
  assert.deepEqual(q.colors, ['olive', 'navy']);
  assert.equal(q.sort, 'relevance');
});
