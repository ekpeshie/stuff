# Hue — web app

A React + TypeScript (Vite) build of the Claude Design prototype in `design/Hue.dc.html`. The design handoff notes, chat transcript and prototype runtime are also in `design/`.

```sh
npm install
cp .env.example .env   # optional: connect a product provider (see below)
npm run dev            # app + product API on one dev server
npm test               # server/feed tests
npm run build && npm start   # production: serves dist/ and /api on PORT (default 8787)
```

With no provider configured the app runs on **sample products**, which are labelled as samples everywhere they appear.

## Product data

### How it fits together

```
provider (feed / API)  →  server adapter  →  normalized Product  →  /api/products  →  ProductSource  →  UI
       credentials stay here ─┘                                        (browser)
```

- `shared/product.ts`: the normalized `Product` model (ID, name, brand, price + currency, image URL, retailer name + product URL, category, colors, sizes, gender, availability, `fetchedAt`) and the normalization helpers.
- `server/providers/types.ts`: the `ProductProvider` interface. A new provider is one file implementing `search` and `get`, registered in `server/config.ts`. The UI doesn't change.
- `server/providers/feed.ts`: the generic **authorized product feed** adapter (below).
- `server/providers/sample.ts` and `shared/sample-catalogue.ts`: the sample catalogue. Every item has `isSample: true`, no retailer link and no image.
- `server/api.ts`: `GET /api/products` (search, category, gender, price range, colors, sort, cursor pagination) and `GET /api/products/:id` (re-checks one product).
- `src/products/`: the browser's `ProductSource`, the paginated `useProductFeed` hook and `useSavedProducts`.

### Rules the code enforces

- **Nothing is invented.** A missing or unparseable brand, price, currency, link or image stays `null`, and the UI says "Price at retailer" or omits the field. Rows without an ID or title are dropped. Only absolute http(s) links are accepted.
- **Samples are never passed off as inventory.** Sample items carry a SAMPLE badge, sample prices are marked illustrative, there are no retailer links, and a banner explains why samples are showing.
- **Fallback is explicit.** If the provider is unconfigured or fails on a first page, the API serves samples with a `fallbackReason`. If it fails mid-scroll, the client shows "Couldn't load more · Retry" and never splices samples into a live feed. Cursors remember which source issued them.
- **Freshness.** Every product has `fetchedAt`. Prices older than the provider's `priceMaxAgeMs` show as "Check price at retailer". Opening a product re-checks it with the provider, and a product that's no longer listed shows as such. Saved items are re-fetched by ID when you open Saved.
- **Caching.** The server holds the normalized feed in memory and refreshes it on `FEED_REFRESH_MINUTES` with conditional requests (ETag / Last-Modified). It serves stale data in the background only while it's within the freshness limit. Browser responses are cached `private, max-age=60`.
- **Images.** Image URLs are passed through only when `FEED_IMAGE_POLICY=direct`, which you set after confirming the feed's terms allow displaying them. Otherwise the striped placeholder shows. Hue doesn't scrape and doesn't re-host images.
- **Credentials.** Feed URLs, which often embed API keys, and auth headers live in server env vars. They're never logged or returned, and error messages shown to users are generic.
- **Retailer links** open with `rel="noopener noreferrer sponsored"`, and the drawer discloses that Hue may earn a commission.
- **Personalization stays local.** The For you ranking (`src/lib.ts` `score`/`rankProducts`) runs in the browser over each page as it loads. It uses the products' color families, the chosen categories, budget, style and fit keywords, and puts sold-out items last. The photo and palette are never sent to the server.

### The feed adapter

`PRODUCT_PROVIDER=feed` reads CSV, TSV or JSON (optionally gzipped) from `FEED_URL`. Columns follow the Google Merchant Center spec (`id`, `title`, `brand`, `price`, `sale_price`, `link`, `image_link`, `availability`, `color`, `size`, `gender`, `product_type`, `item_group_id`). It also accepts the Awin and impact.com style aliases (`aw_product_id`, `product_name`, `brand_name`, `search_price`, `currency`, `aw_deep_link`, `merchant_image_url`, `in_stock`, `colour`, `merchant_name`, `CurrentPrice`, `ImageUrl`, `Url`, `StockAvailability`…). Add more with `FEED_COLUMN_MAP`. Variants that share `item_group_id` are merged into one product with all their colors and sizes. Tracked network deep links are preferred over plain merchant links. See `.env.example` for every setting.

### Provider research (October 2026)

No provider credentials exist in this environment, and its network policy blocks the providers' documentation and API hosts. The table therefore comes from published documentation found through search. **Nothing here has been verified against a live account.** Check the current terms and a real response before switching a provider on.

| Provider | Access | Required fields | Retailer links | Notes |
|---|---|---|---|---|
| **Awin** product feeds | Publisher account and joined advertisers | Google-format feeds: id, title, brand, price + currency, image, link, availability, color, size | `aw_deep_link`, a tracked link to the product page | Fits the feed adapter. Its docs recommend checking feed last-update times rather than polling. Image and cache terms weren't found; check them. |
| **impact.com** catalogs | Partner account and brand approval | Item fields include Name, Manufacturer, CurrentPrice, Currency, ImageUrl, Url, StockAvailability, Color, Size, Category (brand-side schema; partner-side unconfirmed) | `Url` | Catalog export → feed adapter. A live adapter could use `Catalogs/ItemSearch`, but its parameters are unconfirmed. |
| **eBay Browse API** | Open developer signup, OAuth client credentials | `item_summary/search`: title, price, image, `itemWebUrl`. Brand isn't in the summary. | `itemAffiliateWebUrl` with eBay Partner Network | License: displayed listing data must be at most **6 hours** older than eBay's. Marketplace listings, often used items, so a weaker fit for a brand-led feed. |
| **Amazon Creators API** | Associates account with qualifying sales | Item info, offers, images | Associate-tagged links | PA-API 5 was retired in April–May 2026. New integrations must use the Creators API (OAuth 2.0). |
| **CJ Affiliate** | Publisher account | Unclear | — | Sources conflict on whether a product search API is publicly available. Product feeds can use the feed adapter. |
| **Rakuten Advertising** | Publisher account | Not confirmed | — | No official field docs found. Feeds can use the feed adapter. |

**Recommendation:** start with an authorized network feed (Awin, or a catalog export from impact.com or CJ) through the existing feed adapter. It gives brand, price, currency, image, availability and tracked retailer links in one approved channel. Add a live API adapter, for example `server/providers/ebay.ts`, only once you have credentials and have confirmed its fields and terms against a real response.

## Structure

- `shared/`: product model, normalization, in-memory query (filter, sort, paginate), sample catalogue
- `server/`: provider adapters, feed parsing, API handler, production server, tests
- `src/data.ts`: palettes and UI constants
- `src/lib.ts`: local ranking, styling reasons, price display rules, in-browser photo analysis, local storage
- `src/products/`: product source and hooks
- `src/App.tsx`: app state and feed layout (masonry chunks, curated rows, infinite scroll)
- `src/components/`: Header and filter/sort panel, Feed (masonry, tiles, carousels, product image), ProductDrawer, UploadModal, Studio, PaletteExplorer, reset dialog and toast

## Privacy model

- The photo is read with `URL.createObjectURL` and analysed on a canvas in the page. It is never sent anywhere.
- The object URL is revoked as soon as the palette estimate exists.
- `localStorage` (`hue.v1`) holds only saved product IDs, preferences, the palette key and the sampled tone hex. Reset clears everything except saved items.

## Known limits

- The palette estimate is a simple warm/cool and light/deep heuristic. The UI presents it as an estimate.
- Color matching relies on the retailer's color names, mapped to color families in `shared/product.ts`. Unmapped names such as "Multicolour" score neutrally.
- The For you ranking is applied per page as pages load, so a strong match on a later page appears when that page arrives.
- Price filter bands and price sorting compare raw amounts. A feed with mixed currencies would need conversion first.
- The feed adapter holds the whole catalogue in memory, which suits feeds up to roughly a few hundred thousand rows. Larger catalogues need a database or a provider-side search API.
