import { queryProducts } from '../../shared/query';
import { SAMPLE_PRODUCTS, SAMPLE_PROVIDER } from '../../shared/sample-catalogue';
import type { ProductProvider } from './types';

/** Serves the clearly labelled sample catalogue. Used directly, or as the fallback. */
export function createSampleProvider(): ProductProvider {
  return {
    info: () => SAMPLE_PROVIDER,
    search: async (q) => queryProducts(SAMPLE_PRODUCTS, q),
    get: async (externalId) => SAMPLE_PRODUCTS.find((p) => p.externalId === externalId) ?? null,
  };
}
