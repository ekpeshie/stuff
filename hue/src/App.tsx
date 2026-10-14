import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATS, DEFAULT_PREFS, NAV_LABEL, PALETTES, type Cat, type Fam, type PaletteKey, type Prefs } from './data';
import { SORT_LABELS, type Gender, type Product, type ProductQuery, type SortKey } from '../shared/product';
import { fname, hexOf, loadStored, rankProducts, reasonFor, saveStored, type Analysis } from './lib';
import { apiSource } from './products/source';
import { useProductFeed } from './products/useProductFeed';
import { useSavedProducts } from './products/useSavedProducts';
import { Header, FilterPanel, type NavItem } from './components/Header';
import { Feed, Skeleton, type Block, type FeedEntry } from './components/Feed';
import { ProductDrawer } from './components/ProductDrawer';
import { ACCEPTED, UploadModal } from './components/UploadModal';
import { Studio } from './components/Studio';
import { PaletteExplorer } from './components/PaletteExplorer';
import { ResetDialog, Toast, type ToastData } from './components/Overlays';
import { CloseIcon } from './components/Icons';

type View = 'discover' | 'foryou' | 'saved';
type Overlay = null | 'upload' | 'analysis' | 'prefs' | 'palette' | 'reset';

const MAX_BYTES = 15e6;
const GENDERS: Record<string, Gender | undefined> = { All: undefined, Women: 'women', Men: 'men', Unisex: 'unisex' };
const PRICES: Record<string, Pick<ProductQuery, 'minPrice' | 'maxPrice'>> = {
  'Any': {}, 'Under $90': { maxPrice: 89.99 }, '$90–180': { minPrice: 90, maxPrice: 180 }, '$180+': { minPrice: 180.01 },
};
const stored = loadStored();
// IDs from the prototype ("p1") predate provider-scoped IDs ("feed:123"); drop them.
const storedSaved = stored.saved.filter((id) => id.includes(':'));

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => window.innerWidth);

  // Browsing
  const [view, setView] = useState<View>(stored.personalized ? 'foryou' : 'discover');
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gender, setGender] = useState('All');
  const [price, setPrice] = useState('Any');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [colors, setColors] = useState<Fam[]>([]);

  // Persisted (on this device only)
  const [saved, setSaved] = useState<string[]>(storedSaved);
  const [prefs, setPrefs] = useState<Prefs>(stored.prefs);
  const [personalized, setPersonalized] = useState(stored.personalized);
  const [paletteKey, setPaletteKey] = useState<PaletteKey>(stored.paletteKey);
  const [sampleHex, setSampleHex] = useState<string | null>(stored.sampleHex);

  // Overlays
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [photoSmall, setPhotoSmall] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimer = useRef<number>(undefined);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    saveStored({ saved, prefs, personalized, paletteKey, sampleHex });
  }, [saved, prefs, personalized, paletteKey, sampleHex]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const isMobile = width < 720;
  const cols = isMobile ? 2 : width < 1060 ? 3 : width < 1440 ? 4 : 5;
  const padX = isMobile ? 10 : 28;
  const gap = isMobile ? 8 : 14;
  const pal = PALETTES[paletteKey];
  const q = debouncedQuery;
  const forYou = personalized && view === 'foryou' && !colors.length;

  // ---------- Product data ----------
  const productQuery = useMemo<ProductQuery>(() => ({
    q: q || undefined,
    category: cat === 'All' ? undefined : cat,
    gender: GENDERS[gender],
    ...PRICES[price],
    colors: colors.length ? colors : undefined,
    sort,
  }), [q, cat, gender, price, colors, sort]);

  // Personalized ranking happens here, in the browser, page by page.
  const rank = useCallback((items: Product[]) => (forYou ? rankProducts(items, pal, prefs) : items), [forYou, pal, prefs]);
  const feed = useProductFeed(apiSource, productQuery, {
    enabled: view !== 'saved',
    transformPage: rank,
    resetKey: forYou ? `${paletteKey}|${JSON.stringify(prefs)}` : '',
  });
  const savedFeed = useSavedProducts(apiSource, saved, view === 'saved');
  const info = view === 'saved' ? savedFeed.source ?? feed.source : feed.source;

  // Infinite scroll: load the next page when the sentinel nears the viewport.
  const loadMore = feed.loadMore;
  useEffect(() => {
    const el = sentinelRef.current, root = scrollRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { root, rootMargin: '0px 0px 1400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, feed.items.length]);

  const toTop = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const showToast = useCallback((msg: string, label?: string, action?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, label, action });
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  /** Switch the feed's context; anything not passed resets to its default. */
  const browse = (next: { view?: View; cat?: Cat | 'All'; colors?: Fam[]; query?: string }) => {
    setView(next.view ?? 'discover');
    setCat(next.cat ?? 'All');
    setColors(next.colors ?? []);
    setQuery(next.query ?? '');
    setDebouncedQuery(next.query ?? '');
    if (next.query === undefined) setSearchOpen(false);
    setFilterOpen(false);
    toTop();
  };

  const toggleSave = (p: Product) => {
    const was = saved.includes(p.id);
    setSaved((s) => (was ? s.filter((x) => x !== p.id) : [...s, p.id]));
    if (was) showToast('Removed from saved');
    else showToast('Saved to this device', 'View saved', () => { setOpenProduct(null); setToast(null); browse({ view: 'saved' }); });
  };

  const releasePhoto = () => { if (photo) URL.revokeObjectURL(photo); setPhoto(null); setPhotoName(''); };
  const closeOverlay = () => { setOverlay(null); setUpErr(null); };

  const acceptFile = (f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      setUpErr(/hei[cf]/i.test(f.type + f.name)
        ? "HEIC photos aren't supported in this browser yet. Export it as a JPG or PNG and try again."
        : "That file isn't a photo we can read. Try a JPG or PNG.");
      return;
    }
    if (f.size > MAX_BYTES) { setUpErr('That photo is over 15 MB. Try a smaller version.'); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      if (photo) URL.revokeObjectURL(photo);
      setPhoto(url); setPhotoName(f.name); setUpErr(null); setPhotoSmall(Math.min(img.width, img.height) < 320);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setUpErr("We couldn't open that image. Try a different JPG or PNG."); };
    img.src = url;
  };

  const onStudioDone = (nextPrefs: Prefs, result: Analysis | null) => {
    setPrefs(nextPrefs);
    setOverlay(null);
    if (result) {
      // The photo is discarded as soon as the estimate exists; only the result is kept.
      releasePhoto();
      setPersonalized(true);
      setPaletteKey(result.key);
      setSampleHex(result.hex);
      browse({ view: 'foryou' });
      showToast('Your style edit is ready · photo discarded');
    } else {
      browse({ view: 'foryou' });
      showToast('Preferences updated');
    }
  };

  const doReset = () => {
    setPersonalized(false); setPrefs({ ...DEFAULT_PREFS }); setPaletteKey('warmDeep'); setSampleHex(null);
    setOverlay(null);
    browse({});
    showToast('Personalization cleared from this device');
  };

  const togColor = (f: Fam) => {
    setColors((c) => (c.includes(f) ? c.filter((x) => x !== f) : [...c, f].slice(-3)));
    if (view === 'saved') setView('discover');
    setQuery(''); setDebouncedQuery(''); setSearchOpen(false);
    toTop();
  };

  // Escape closes the top-most layer.
  const escRef = useRef<() => void>(() => {});
  escRef.current = () => {
    if (overlay === 'reset') setOverlay(null);
    else if (openProduct) setOpenProduct(null);
    else if (filterOpen) setFilterOpen(false);
    else if (overlay) closeOverlay();
    else if (searchOpen) { setSearchOpen(false); setQuery(''); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') escRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Feed layout ----------
  const items = view === 'saved' ? savedFeed.items : feed.items;
  const loading = view === 'saved' ? savedFeed.loading : feed.loading;
  const curated = view !== 'saved' && !q && !colors.length && cat === 'All';

  const blocks = useMemo(() => {
    let idx = 0;
    // A short styling reason on every third tile of the personalized feed — enough to explain, not clutter.
    const entry = (product: Product): FeedEntry => ({ product, key: product.id, reason: forYou && idx++ % 3 === 1 ? reasonFor(product, pal) : '' });
    if (!curated) return items.length ? [{ kind: 'grid', key: 'g', entries: items.map(entry) } as Block] : [];

    const has = (p: Product, fams: Fam[]) => p.colors.some((c) => c.family && fams.includes(c.family));
    const rowDefs: { title: string; sub: string; pick: (p: Product) => boolean }[] = forYou ? [
      { title: 'Your neutrals', sub: pal.neu.map(fname).join(', ') + ' — the foundations.', pick: (p) => has(p, pal.neu) },
      { title: 'Accents to try', sub: 'Small doses of color that lift the rest.', pick: (p) => has(p, [...pal.acc, ...pal.alt]) },
      { title: 'Outfits in your palette', sub: 'Complete looks built around your colors.', pick: (p) => p.category === 'Outfits' && has(p, [...pal.rec, ...pal.neu]) },
    ] : [
      { title: 'Quiet layers', sub: 'Knits, overshirts and coats in soft neutrals.', pick: (p) => (p.category === 'Jackets' || p.category === 'Tops') && has(p, ['cream', 'camel', 'tan', 'grey', 'ivory', 'olive', 'sage']) },
      { title: 'Denim, every way', sub: 'Indigo, washed and light blue.', pick: (p) => has(p, ['denim', 'blue', 'navy']) },
      { title: 'Shoes and finishing pieces', sub: 'Footwear, bags and accessories.', pick: (p) => p.category === 'Shoes' || p.category === 'Accessories' },
      { title: 'Complete looks', sub: 'Dresses and head-to-toe outfits.', pick: (p) => p.category === 'Outfits' || p.category === 'Dresses' },
    ];
    const out: Block[] = [];
    const chunk = isMobile ? 10 : cols * 3 + 2;
    for (let i = 0, r = 0; i < items.length; i += chunk, r++) {
      out.push({ kind: 'grid', key: `g${r}`, entries: items.slice(i, i + chunk).map(entry) });
      // Curated rows draw from what's loaded so far; skip a row that has too little to show.
      if (i + chunk < items.length || r === 0) {
        const def = rowDefs[r % rowDefs.length];
        const its = items.filter(def.pick).slice(0, 10).map((product) => ({ product, key: `${product.id}~r${r}`, reason: '' }));
        if (its.length >= 3) out.push({ kind: 'row', key: `r${r}`, title: def.title, sub: def.sub, entries: its });
      }
    }
    return out;
  }, [items, curated, forYou, pal, isMobile, cols]);

  const total = view === 'saved' ? savedFeed.items.length : feed.total;
  const isEmpty = !loading && !feed.error && items.length === 0;
  let emptyTitle = 'No pieces match these filters.', emptyBody = 'Try removing a color or loosening the price range.';
  let suggestions: string[] = [];
  if (view === 'saved' && !saved.length) { emptyTitle = 'Nothing saved yet.'; emptyBody = 'Tap the heart on any piece to keep it here. Saved pieces stay on this device — no account needed.'; }
  else if (view === 'saved') { emptyTitle = 'Your saved pieces are no longer listed.'; emptyBody = 'The retailers have removed them, or they couldn’t be checked right now.'; }
  else if (q) { emptyTitle = `Nothing for “${q}” yet.`; emptyBody = 'Try a broader word, a color, or one of these:'; suggestions = ['Trench', 'Olive', 'Loafer', 'Knit', 'Burgundy']; }
  else if (forYou) { emptyTitle = 'Nothing to rank yet.'; emptyBody = 'No products are available from the current source right now.'; }

  let contextTitle = '', contextSub = total != null ? `${total} piece${total === 1 ? '' : 's'}` : '';
  if (view === 'saved') { contextTitle = 'Saved'; contextSub += ' · kept on this device only'; }
  else if (q) contextTitle = `Results for “${q}”`;
  else if (colors.length) { contextTitle = colors.length > 1 ? 'Shopping a combination' : 'Shopping by color'; if (colors.length > 1) contextSub += ' · strongest matches first'; }
  else if (cat !== 'All') contextTitle = NAV_LABEL[cat] || cat;
  const showContext = !!contextTitle && !(isEmpty && !colors.length && view !== 'saved');

  const clearContext = () => {
    setGender('All'); setPrice('Any'); setSort('relevance');
    browse({ view: personalized && view === 'foryou' ? 'foryou' : 'discover' });
  };

  const nav: NavItem[] = [{ label: 'Discover', cat: 'All' as const }, ...CATS.map((c) => ({ label: NAV_LABEL[c] || c, cat: c }))].map((n) => ({
    label: n.label,
    active: cat === n.cat && view !== 'saved' && (n.cat !== 'All' || view === 'discover'),
    onClick: () => browse({ cat: n.cat, view: n.cat === 'All' || view === 'saved' ? 'discover' : view }),
  }));

  const sorts = (feed.source?.sorts ?? ['relevance']).map((s) => SORT_LABELS[s]);
  const sheet = isMobile;
  const anyOverlay = !!(overlay || openProduct);
  const sampleNotice = info?.kind === 'sample';
  const missingSaved = view === 'saved' ? savedFeed.missing.length : 0;

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <div ref={scrollRef} aria-hidden={anyOverlay || undefined}
        style={{ height: '100%', overflowY: anyOverlay ? 'hidden' : 'auto', overflowX: 'hidden' }}>
        <Header
          isMobile={isMobile} padX={padX} nav={nav}
          searchOpen={searchOpen} query={query}
          onQuery={(v) => { setQuery(v); setColors([]); setCat('All'); if (view === 'saved') setView('discover'); }}
          toggleSearch={() => { setSearchOpen((o) => !o); setFilterOpen(false); }}
          closeSearch={() => { setSearchOpen(false); setQuery(''); }}
          filterOpen={filterOpen} filtersActive={gender !== 'All' || price !== 'Any' || sort !== 'relevance'} toggleFilter={() => setFilterOpen((o) => !o)}
          filterPanel={<FilterPanel padX={padX} gender={gender} price={price} setGender={setGender} setPrice={setPrice}
            sorts={sorts} sort={SORT_LABELS[sort]} setSort={(label) => setSort((Object.keys(SORT_LABELS) as SortKey[]).find((k) => SORT_LABELS[k] === label) ?? 'relevance')}
            clear={() => { setGender('All'); setPrice('Any'); setSort('relevance'); }} close={() => setFilterOpen(false)} />}
          savedCount={saved.length} showSaved={() => browse({ view: 'saved' })}
          goHome={() => browse({})}
          personalized={personalized} forYouActive={forYou} ctaDots={pal.rec.slice(0, 3).map(hexOf)}
          openUpload={() => { setOverlay('upload'); setUpErr(null); setFilterOpen(false); }}
          goForYou={() => browse({ view: 'foryou' })}
        />

        {sampleNotice && (
          <div role="note" style={{ margin: `14px ${padX}px 0`, padding: '10px 14px', borderRadius: 'var(--radius-panel)', background: 'var(--panel)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ fontWeight: 500 }}>Showing sample products — not real inventory.</span>
            <span style={{ color: 'var(--muted-2)' }}>{info?.fallbackReason ?? ''} Brands and prices are illustrative and there are no retailer links.</span>
          </div>
        )}

        {personalized && (
          <div style={{ padding: `20px ${padX}px 8px`, display: 'flex', flexWrap: 'wrap', gap: '14px 32px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>Your style edit</div>
              <div className="pretty" style={{ fontSize: 14, color: 'var(--muted)' }}>Colors and pieces selected around your palette and preferences.</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div role="group" aria-label="Filter by a palette color" style={{ display: 'flex', gap: 4 }}>
                  {[...pal.rec, ...pal.neu].map((f) => {
                    const on = colors.includes(f);
                    return (
                      <button key={f} onClick={() => togColor(f)} aria-label={`${on ? 'Remove' : 'Shop'} ${fname(f)}`} aria-pressed={on} title={fname(f)}
                        style={{ width: 26, height: 26, borderRadius: 999, border: 0, background: hexOf(f), cursor: 'pointer', boxShadow: `inset 0 0 0 1px rgba(31,29,26,.12), 0 0 0 ${on ? 2 : 0}px var(--bg), 0 0 0 ${on ? 3.5 : 0}px var(--ink)` }} />
                    );
                  })}
                </div>
                <button className="link-btn" onClick={() => setOverlay('palette')} style={{ padding: '6px 0', fontSize: 13, whiteSpace: 'nowrap' }}>{pal.name} · estimate</button>
              </div>
              <div role="tablist" aria-label="Feed" style={{ display: 'flex', background: 'var(--hover)', borderRadius: 999, padding: 3 }}>
                {([['For you', view === 'foryou', 'foryou'], ['All fashion', view !== 'foryou', 'discover']] as const).map(([label, sel, v]) => (
                  <button key={v} role="tab" aria-selected={sel} onClick={() => browse({ view: v })}
                    style={{ height: 34, padding: '0 16px', borderRadius: 999, border: 0, background: sel ? 'var(--bg)' : 'transparent', fontSize: 13, cursor: 'pointer', boxShadow: sel ? '0 1px 3px rgba(31,29,26,.12)' : 'none' }}>{label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button className="btn-outline" onClick={() => setOverlay('palette')} style={{ height: 34, padding: '0 12px', fontSize: 13 }}>Colors</button>
                <button className="btn-outline" onClick={() => setOverlay('prefs')} style={{ height: 34, padding: '0 12px', fontSize: 13 }}>Edit preferences</button>
                <button className="link-btn" onClick={() => setOverlay('reset')} style={{ height: 34, padding: '0 10px', fontSize: 13, color: 'var(--muted)' }}>Reset</button>
              </div>
            </div>
          </div>
        )}

        {showContext && (
          <div style={{ padding: `22px ${padX}px 4px`, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
            <h1 className="serif" style={{ fontSize: 30, lineHeight: 1.1 }}>{contextTitle}</h1>
            {!loading && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{contextSub}</span>}
            {colors.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {colors.map((f) => (
                  <button key={f} className="btn-outline" onClick={() => togColor(f)} aria-label={`Remove ${fname(f)}`} style={{ height: 32, padding: '0 10px 0 6px', gap: 7, fontSize: 13 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 999, background: hexOf(f), boxShadow: 'inset 0 0 0 1px rgba(31,29,26,.12)' }} />{fname(f)}<CloseIcon size={12} sw={2} />
                  </button>
                ))}
              </div>
            )}
            <button className="link-btn" onClick={clearContext} style={{ padding: '4px 0', fontSize: 13, color: 'var(--muted)' }}>{view === 'saved' ? 'Back to feed' : 'Clear'}</button>
          </div>
        )}

        {missingSaved > 0 && !loading && (
          <div role="status" style={{ margin: `8px ${padX}px 0`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', fontSize: 13, color: 'var(--muted-2)' }}>
            <span>{missingSaved} saved piece{missingSaved === 1 ? ' is' : 's are'} no longer listed by the retailer.</span>
            <button className="link-btn" onClick={() => setSaved((s) => s.filter((id) => !savedFeed.missing.includes(id)))} style={{ fontSize: 13, padding: 0 }}>Remove from saved</button>
          </div>
        )}

        <main style={{ padding: '14px 0 40px' }} aria-busy={loading || undefined}>
          {loading && items.length === 0 && <Skeleton cols={cols} gap={gap} padX={padX} rows={3} />}

          {view !== 'saved' && feed.error && items.length === 0 && (
            <div role="alert" style={{ padding: '64px 20px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, maxWidth: 520, margin: '0 auto' }}>
              <div className="serif pretty" style={{ fontSize: 34, lineHeight: 1.1 }}>We couldn't load the feed.</div>
              <div className="pretty" style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.5 }}>{feed.error}</div>
              <button className="btn-dark" onClick={feed.retry} style={{ marginTop: 8, height: 42, padding: '0 20px', fontSize: 14 }}>Try again</button>
            </div>
          )}

          <Feed blocks={blocks} cols={cols} gap={gap} padX={padX} isMobile={isMobile} info={info}
            saved={saved} onOpen={setOpenProduct} onSave={toggleSave} />

          {view !== 'saved' && feed.loadingMore && <Skeleton cols={cols} gap={gap} padX={padX} />}
          {view !== 'saved' && feed.error && items.length > 0 && (
            <div role="alert" style={{ padding: '24px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--muted-2)' }}>
              Couldn't load more pieces.
              <button className="btn-outline" onClick={feed.retry} style={{ height: 38, padding: '0 16px', fontSize: 13 }}>Retry</button>
            </div>
          )}
          <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />

          {isEmpty && (
            <div style={{ padding: '64px 20px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, maxWidth: 520, margin: '0 auto' }}>
              <div className="serif pretty" style={{ fontSize: 34, lineHeight: 1.1 }}>{emptyTitle}</div>
              <div className="pretty" style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.5 }}>{emptyBody}</div>
              {suggestions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                  {suggestions.map((s) => (
                    <button key={s} className="btn-outline" onClick={() => { setQuery(s); setDebouncedQuery(s); setColors([]); }} style={{ height: 38, padding: '0 16px', fontSize: 13 }}>{s}</button>
                  ))}
                </div>
              )}
              <button className="btn-dark" onClick={clearContext} style={{ marginTop: 8, height: 42, padding: '0 20px', fontSize: 14 }}>Back to all fashion</button>
            </div>
          )}

          {!isEmpty && !loading && (view === 'saved' || (feed.done && !feed.error)) && (
            <div style={{ padding: '40px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <div style={{ width: 40, height: 1, background: 'var(--divider)' }} />
              <div className="serif" style={{ fontSize: 24 }}>That's everything here for now.</div>
              <button className="link-btn" onClick={clearContext} style={{ fontSize: 13.5 }}>Keep exploring all fashion</button>
            </div>
          )}
        </main>
      </div>

      {openProduct && (
        <ProductDrawer product={openProduct} info={info} source={apiSource} pool={items} sheet={sheet} personalized={personalized} pal={pal}
          saved={saved.includes(openProduct.id)} onSave={toggleSave} onClose={() => setOpenProduct(null)} onOpen={setOpenProduct} />
      )}

      {overlay === 'upload' && (
        <UploadModal sheet={sheet} photo={photo} photoName={photoName} photoSmall={photoSmall} error={upErr}
          onFile={acceptFile} onRemove={releasePhoto} onContinue={() => { if (photo) setOverlay('analysis'); }} onClose={closeOverlay} />
      )}

      {(overlay === 'analysis' || overlay === 'prefs') && (
        <Studio key={overlay} mode={overlay === 'analysis' ? 'analysis' : 'prefs'} isMobile={isMobile} padX={padX} photo={photo}
          paletteKey={paletteKey} prefs={prefs} onDone={onStudioDone} onClose={closeOverlay}
          onNewPhoto={() => setOverlay('upload')} />
      )}

      {overlay === 'palette' && (
        <PaletteExplorer pal={pal} isMobile={isMobile} padX={padX} initialSel={colors} onClose={closeOverlay}
          onApply={(fams) => { setOverlay(null); browse({ colors: fams }); }} />
      )}

      {overlay === 'reset' && <ResetDialog sheet={sheet} onCancel={() => setOverlay(null)} onConfirm={doReset} />}

      {toast && <Toast toast={toast} />}
    </div>
  );
}
