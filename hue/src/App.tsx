import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATS, DEFAULT_PREFS, ITEMS, NAV_LABEL, PALETTES, type Cat, type Fam, type Item, type PaletteKey, type Prefs } from './data';
import { fname, hexOf, inBudget, loadStored, reasonFor, saveStored, score, shuffle, type Analysis } from './lib';
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

const MAX_PAGES = 40;
const MAX_BYTES = 15e6;
const stored = loadStored();

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => window.innerWidth);

  // Browsing
  const [view, setView] = useState<View>(stored.personalized ? 'foryou' : 'discover');
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gender, setGender] = useState('All');
  const [price, setPrice] = useState('Any');
  const [colors, setColors] = useState<Fam[]>([]);
  const [pages, setPages] = useState(2);
  const [loading, setLoading] = useState(false);

  // Persisted
  const [saved, setSaved] = useState<string[]>(stored.saved);
  const [prefs, setPrefs] = useState<Prefs>(stored.prefs);
  const [personalized, setPersonalized] = useState(stored.personalized);
  const [paletteKey, setPaletteKey] = useState<PaletteKey>(stored.paletteKey);
  const [sampleHex, setSampleHex] = useState<string | null>(stored.sampleHex);

  // Overlays
  const [productId, setProductId] = useState<string | null>(null);
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

  const isMobile = width < 720;
  const cols = isMobile ? 2 : width < 1060 ? 3 : width < 1440 ? 4 : 5;
  const padX = isMobile ? 10 : 28;
  const gap = isMobile ? 8 : 14;
  const pal = PALETTES[paletteKey];
  const q = query.trim().toLowerCase();
  const forYou = personalized && view === 'foryou' && !colors.length;

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
    if (next.query === undefined) setSearchOpen(false);
    setFilterOpen(false);
    setPages(2);
    toTop();
  };

  const toggleSave = (id: string) => {
    const was = saved.includes(id);
    setSaved((s) => (was ? s.filter((x) => x !== id) : [...s, id]));
    if (was) showToast('Removed from saved');
    else showToast('Saved to this device', 'View saved', () => { setProductId(null); setToast(null); browse({ view: 'saved' }); });
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
    setQuery(''); setSearchOpen(false);
    toTop();
  };

  // Escape closes the top-most layer.
  const escRef = useRef<() => void>(() => {});
  escRef.current = () => {
    if (overlay === 'reset') setOverlay(null);
    else if (productId) setProductId(null);
    else if (filterOpen) setFilterOpen(false);
    else if (overlay) closeOverlay();
    else if (searchOpen) { setSearchOpen(false); setQuery(''); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') escRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Feed assembly ----------
  const feed = useMemo(() => {
    let base: Item[] = ITEMS.slice();
    if (view === 'saved') base = base.filter((it) => saved.includes(it.id));
    if (cat !== 'All') base = base.filter((it) => it.cat === cat);
    if (gender !== 'All') base = base.filter((it) => (gender === 'Unisex' ? it.g === 'U' : it.g === gender[0] || it.g === 'U'));
    if (price !== 'Any') base = base.filter((it) => it.price != null && inBudget(it, price));
    if (q) base = base.filter((it) => [it.name, it.brand, it.cat, NAV_LABEL[it.cat] || '', ...it.fams.map(fname)].join(' ').toLowerCase().includes(q));
    const matches = (it: Item) => it.fams.filter((f) => colors.includes(f)).length;
    if (colors.length) base = base.filter((it) => matches(it) > 0).sort((a, b) => matches(b) - matches(a));
    if (forYou) base = base.map((it) => ({ it, sc: score(it, pal, prefs) })).filter((x) => x.sc > 2).sort((a, b) => b.sc - a.sc).map((x) => x.it);

    const endless = view !== 'saved' && !q && !colors.length && cat === 'All' && base.length >= 6;
    let list: { item: Item; key: string }[] = [];
    if (endless) for (let p = 0; p < pages; p++) (p === 0 ? base : shuffle(base, p + 3)).forEach((item) => list.push({ item, key: `${item.id}~${p}` }));
    else list = base.map((item) => ({ item, key: item.id }));

    let idx = 0;
    // A short styling reason on every third tile of the personalized feed — enough to explain, not clutter.
    const entry = (x: { item: Item; key: string }): FeedEntry => ({ ...x, reason: forYou && idx++ % 3 === 1 ? reasonFor(x.item, pal) : '' });

    const rowDefs: { title: string; sub: string; pick: (it: Item) => boolean }[] = forYou ? [
      { title: 'Outfits in your palette', sub: 'Complete looks assembled across several stores.', pick: (it) => it.cat === 'Outfits' || score(it, pal, prefs) > 5 },
      { title: 'Your neutrals', sub: pal.neu.map(fname).join(', ') + ' — the foundations.', pick: (it) => it.fams.some((f) => pal.neu.includes(f)) },
      { title: 'Accents to try', sub: 'Small doses of color that lift the rest.', pick: (it) => it.fams.some((f) => pal.acc.includes(f) || pal.alt.includes(f)) },
    ] : [
      { title: 'Quiet layers', sub: 'Knits, overshirts and coats in soft neutrals.', pick: (it) => ['Jackets', 'Tops'].includes(it.cat) && it.fams.some((f) => ['cream', 'camel', 'tan', 'grey', 'ivory', 'olive', 'sage'].includes(f)) },
      { title: 'Complete looks', sub: 'Head-to-toe outfits from several stores.', pick: (it) => it.cat === 'Outfits' || it.cat === 'Dresses' },
      { title: 'Denim, every way', sub: 'Indigo, washed and light blue.', pick: (it) => it.fams.some((f) => ['denim', 'blue', 'navy'].includes(f)) },
      { title: 'Shoes for the season', sub: 'Loafers, boots, clogs and court sneakers.', pick: (it) => it.cat === 'Shoes' || it.cat === 'Accessories' },
    ];

    const blocks: Block[] = [];
    if (endless) {
      const chunk = isMobile ? 10 : cols * 3 + 2;
      for (let i = 0, r = 0; i < list.length; i += chunk, r++) {
        blocks.push({ kind: 'grid', key: `g${r}`, entries: list.slice(i, i + chunk).map(entry) });
        if (i + chunk < list.length || r === 0) {
          const def = rowDefs[r % rowDefs.length];
          const its = ITEMS.filter(def.pick).filter((it) => gender === 'All' || it.g === 'U' || it.g === gender[0]).slice(0, 10)
            .map((item) => ({ item, key: `${item.id}~r${r}`, reason: '' }));
          if (its.length >= 3) blocks.push({ kind: 'row', key: `r${r}`, title: def.title, sub: def.sub, entries: its });
        }
      }
    } else if (list.length) blocks.push({ kind: 'grid', key: 'g', entries: list.map(entry) });

    return { blocks, endless, count: list.length };
  }, [view, saved, cat, gender, price, q, colors, forYou, pal, prefs, pages, isMobile, cols]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (feed.endless && !loading && pages < MAX_PAGES && el.scrollTop + el.clientHeight > el.scrollHeight - 1400) {
      setLoading(true);
      window.setTimeout(() => { setPages((p) => p + 1); setLoading(false); }, 650);
    }
  };

  const isEmpty = feed.count === 0;
  let emptyTitle = 'No pieces match these filters.', emptyBody = 'Try removing a color or loosening the price range.';
  let suggestions: string[] = [];
  if (view === 'saved' && !saved.length) { emptyTitle = 'Nothing saved yet.'; emptyBody = 'Tap the heart on any piece to keep it here. Saved pieces stay on this device — no account needed.'; }
  else if (q) { emptyTitle = `Nothing for “${query.trim()}” yet.`; emptyBody = 'Try a broader word, a color, or one of these:'; suggestions = ['Trench', 'Olive', 'Loafer', 'Knit', 'Burgundy']; }
  else if (forYou) { emptyTitle = 'Your preferences are very specific.'; emptyBody = 'Nothing in the feed matches all of them right now. Loosen a category or budget to see more.'; }

  let contextTitle = '', contextSub = `${feed.count} piece${feed.count === 1 ? '' : 's'}`;
  if (view === 'saved') { contextTitle = 'Saved'; contextSub += ' · kept on this device only'; }
  else if (q) contextTitle = `Results for “${query.trim()}”`;
  else if (colors.length) { contextTitle = colors.length > 1 ? 'Shopping a combination' : 'Shopping by color'; if (colors.length > 1) contextSub += ' · strongest matches first'; }
  else if (cat !== 'All') contextTitle = NAV_LABEL[cat] || cat;
  const showContext = !!contextTitle && !(isEmpty && !colors.length && view !== 'saved');

  const clearContext = () => {
    setGender('All'); setPrice('Any');
    browse({ view: personalized && view === 'foryou' ? 'foryou' : 'discover' });
  };

  const nav: NavItem[] = [{ label: 'Discover', cat: 'All' as const }, ...CATS.map((c) => ({ label: NAV_LABEL[c] || c, cat: c }))].map((n) => ({
    label: n.label,
    active: cat === n.cat && view !== 'saved' && (n.cat !== 'All' || view === 'discover'),
    onClick: () => browse({ cat: n.cat, view: n.cat === 'All' || view === 'saved' ? 'discover' : view }),
  }));

  const item = productId ? ITEMS.find((i) => i.id === productId) : undefined;
  const sheet = isMobile;
  const anyOverlay = !!(overlay || productId);

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <div ref={scrollRef} onScroll={onScroll} aria-hidden={anyOverlay || undefined}
        style={{ height: '100%', overflowY: anyOverlay ? 'hidden' : 'auto', overflowX: 'hidden' }}>
        <Header
          isMobile={isMobile} padX={padX} nav={nav}
          searchOpen={searchOpen} query={query}
          onQuery={(v) => { setQuery(v); setColors([]); setCat('All'); }}
          toggleSearch={() => { setSearchOpen((o) => !o); setFilterOpen(false); }}
          closeSearch={() => { setSearchOpen(false); setQuery(''); }}
          filterOpen={filterOpen} filtersActive={gender !== 'All' || price !== 'Any'} toggleFilter={() => setFilterOpen((o) => !o)}
          filterPanel={<FilterPanel padX={padX} gender={gender} price={price} setGender={setGender} setPrice={setPrice}
            clear={() => { setGender('All'); setPrice('Any'); }} close={() => setFilterOpen(false)} />}
          savedCount={saved.length} showSaved={() => browse({ view: 'saved' })}
          goHome={() => browse({})}
          personalized={personalized} forYouActive={forYou} ctaDots={pal.rec.slice(0, 3).map(hexOf)}
          openUpload={() => { setOverlay('upload'); setUpErr(null); setFilterOpen(false); }}
          goForYou={() => browse({ view: 'foryou' })}
        />

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
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{contextSub}</span>
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

        <main style={{ padding: '14px 0 40px' }}>
          <Feed blocks={feed.blocks} cols={cols} gap={gap} padX={padX} isMobile={isMobile} alwaysDetails={false}
            saved={saved} onOpen={setProductId} onSave={toggleSave} />

          {loading && feed.endless && <Skeleton cols={cols} gap={gap} padX={padX} />}

          {isEmpty && (
            <div style={{ padding: '64px 20px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, maxWidth: 520, margin: '0 auto' }}>
              <div className="serif pretty" style={{ fontSize: 34, lineHeight: 1.1 }}>{emptyTitle}</div>
              <div className="pretty" style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.5 }}>{emptyBody}</div>
              {suggestions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                  {suggestions.map((s) => (
                    <button key={s} className="btn-outline" onClick={() => { setQuery(s); setColors([]); }} style={{ height: 38, padding: '0 16px', fontSize: 13 }}>{s}</button>
                  ))}
                </div>
              )}
              <button className="btn-dark" onClick={clearContext} style={{ marginTop: 8, height: 42, padding: '0 20px', fontSize: 14 }}>Back to all fashion</button>
            </div>
          )}

          {!feed.endless && !isEmpty && (
            <div style={{ padding: '40px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <div style={{ width: 40, height: 1, background: 'var(--divider)' }} />
              <div className="serif" style={{ fontSize: 24 }}>That's everything here for now.</div>
              <button className="link-btn" onClick={clearContext} style={{ fontSize: 13.5 }}>Keep exploring all fashion</button>
            </div>
          )}
        </main>
      </div>

      {item && (
        <ProductDrawer item={item} sheet={sheet} personalized={personalized} pal={pal} prefs={prefs}
          saved={saved.includes(item.id)} onSave={() => toggleSave(item.id)} onClose={() => setProductId(null)} onOpen={setProductId} />
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
