import { useEffect, useState } from 'react';
import type { Product, ProviderInfo } from '../../shared/product';
import type { ProductSource } from './source';

export interface SavedState {
  items: Product[];
  source: ProviderInfo | null;
  /** Saved IDs the provider no longer lists. */
  missing: string[];
  /** Saved IDs that couldn't be checked right now. */
  unchecked: string[];
  loading: boolean;
}

/** Re-fetches saved products by ID so their price and availability are current. */
export function useSavedProducts(source: ProductSource, ids: string[], enabled: boolean): SavedState {
  const [state, setState] = useState<SavedState>({ items: [], source: null, missing: [], unchecked: [], loading: false });
  const key = ids.join(',');

  useEffect(() => {
    if (!enabled) return;
    const c = new AbortController();
    const list = key ? key.split(',') : [];
    setState((s) => ({ ...s, loading: true }));
    Promise.allSettled(list.map((id) => source.get(id, c.signal))).then((results) => {
      if (c.signal.aborted) return;
      const next: SavedState = { items: [], source: null, missing: [], unchecked: [], loading: false };
      results.forEach((r, i) => {
        if (r.status === 'rejected') next.unchecked.push(list[i]);
        else if (!r.value.product) next.missing.push(list[i]);
        else { next.items.push(r.value.product); next.source ??= r.value.source; }
      });
      setState(next);
    });
    return () => c.abort();
  }, [source, key, enabled]);

  return state;
}
