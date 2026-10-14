import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product, ProductQuery, ProviderInfo } from '../../shared/product';
import type { ProductSource } from './source';

export interface FeedState {
  items: Product[];
  source: ProviderInfo | null;
  total: number | null;
  /** First page loading. */
  loading: boolean;
  /** A further page loading. */
  loadingMore: boolean;
  error: string | null;
  done: boolean;
  loadMore: () => void;
  retry: () => void;
}

const PAGE_SIZE = 48;

/**
 * Cursor-paginated product feed. Changing the query resets it; `loadMore` appends the next
 * page. `transformPage` lets the caller rank each page locally (the personalization ranking
 * runs here in the browser — the photo and palette never leave the device).
 */
export function useProductFeed(
  source: ProductSource,
  query: ProductQuery,
  opts: { enabled?: boolean; transformPage?: (items: Product[]) => Product[]; /** Changing this reloads the feed (e.g. new ranking inputs). */ resetKey?: string } = {},
): FeedState {
  const enabled = opts.enabled ?? true;
  const queryKey = JSON.stringify(query);
  const key = `${queryKey}|${opts.resetKey ?? ''}`;
  const [state, setState] = useState<Omit<FeedState, 'loadMore' | 'retry'> & { cursor: string | null; key: string }>({
    items: [], source: null, total: null, loading: enabled, loadingMore: false, error: null, done: false, cursor: null, key,
  });
  const ctrl = useRef<AbortController | null>(null);
  /** True while a first page is in flight; "load more" must never abort or race it. */
  const resetting = useRef(false);
  const transform = useRef(opts.transformPage);
  transform.current = opts.transformPage;

  const fetchPage = useCallback(async (cursor: string | null, reset: boolean) => {
    if (!reset && resetting.current) return;
    resetting.current = reset;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState((s) => ({ ...s, ...(reset ? { items: [], cursor: null, done: false, total: null, loading: true } : { loadingMore: true }), error: null, key }));
    try {
      const page = await source.list({ ...(JSON.parse(queryKey) as ProductQuery), cursor, limit: PAGE_SIZE }, c.signal);
      if (c.signal.aborted) return;
      resetting.current = false;
      const items = transform.current ? transform.current(page.items) : page.items;
      setState((s) => {
        const seen = new Set(reset ? [] : s.items.map((p) => p.id));
        return {
          ...s, key, source: page.source, total: page.total,
          items: [...(reset ? [] : s.items), ...items.filter((p) => !seen.has(p.id))],
          cursor: page.nextCursor, done: !page.nextCursor, loading: false, loadingMore: false,
        };
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      resetting.current = false;
      setState((s) => ({ ...s, loading: false, loadingMore: false, error: "We couldn't load products. Check your connection and try again." }));
    }
  }, [source, key, queryKey]);

  useEffect(() => {
    if (!enabled) return;
    fetchPage(null, true);
    return () => ctrl.current?.abort();
  }, [enabled, fetchPage]);

  const { cursor, done, loading, loadingMore, error } = state;
  // The cursor must belong to the current query: a cursor left over from the previous query
  // would otherwise fetch the wrong page of the new one.
  const current = state.key === key;
  const loadMore = useCallback(() => {
    if (enabled && current && !done && !loading && !loadingMore && !error && cursor) fetchPage(cursor, false);
  }, [enabled, current, done, loading, loadingMore, error, cursor, fetchPage]);
  const retry = useCallback(() => fetchPage(state.items.length ? state.cursor : null, !state.items.length), [fetchPage, state.items.length, state.cursor]);

  // While a new query's first page is in flight, don't show the previous query's items.
  const stale = state.key !== key;
  return {
    items: stale ? [] : state.items, source: state.source, total: stale ? null : state.total,
    loading: stale ? enabled : state.loading, loadingMore: state.loadingMore, error: state.error, done: state.done,
    loadMore, retry,
  };
}
