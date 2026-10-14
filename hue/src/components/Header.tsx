import { useEffect, useRef } from 'react';
import { Dots, FilterIcon, HeartIcon, SearchIcon } from './Icons';

export interface NavItem { label: string; active: boolean; onClick: () => void }

interface Props {
  isMobile: boolean;
  padX: number;
  nav: NavItem[];
  searchOpen: boolean;
  query: string;
  onQuery: (q: string) => void;
  toggleSearch: () => void;
  closeSearch: () => void;
  filterOpen: boolean;
  filtersActive: boolean;
  toggleFilter: () => void;
  filterPanel: React.ReactNode;
  savedCount: number;
  showSaved: () => void;
  goHome: () => void;
  personalized: boolean;
  forYouActive: boolean;
  ctaDots: string[];
  openUpload: () => void;
  goForYou: () => void;
}

const DEFAULT_DOTS = ['#d67a61', '#9aa488', '#9db4cf'];

export function Header(p: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (p.searchOpen) searchRef.current?.focus(); }, [p.searchOpen]);

  const searchField = (mobile: boolean) => (
    <div style={mobile
      ? { display: 'flex', alignItems: 'center', gap: 8, margin: '0 12px 10px', height: 42, borderBottom: '1.5px solid var(--ink)' }
      : { display: 'flex', alignItems: 'center', gap: 10, height: 40, borderBottom: '1.5px solid var(--ink)', maxWidth: 560 }}>
      {!mobile && <SearchIcon size={18} />}
      <input
        ref={searchRef} type="search" value={p.query} aria-label="Search"
        onChange={(e) => p.onQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); p.closeSearch(); } }}
        placeholder={mobile ? 'Search pieces, brands, colors' : 'Search pieces, brands or colors'}
        style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', fontSize: mobile ? 16 : 15, height: mobile ? 40 : 38 }}
      />
      <button className="btn-reset" onClick={p.closeSearch} style={{ fontSize: 13, color: 'var(--muted)', padding: mobile ? '10px 4px' : 6 }}>Close</button>
    </div>
  );

  const personalizedBtn = (mobile: boolean) => {
    const bg = p.forYouActive ? 'var(--ink)' : 'var(--bg)';
    return (
      <button
        onClick={p.goForYou}
        style={{
          marginLeft: mobile ? 0 : 8, height: mobile ? 38 : 40, padding: mobile ? '0 14px' : '0 18px 0 14px', borderRadius: 999,
          border: '1px solid var(--ink)', background: bg, color: p.forYouActive ? 'var(--bg)' : 'var(--ink)',
          display: 'flex', alignItems: 'center', gap: mobile ? 8 : 10, cursor: 'pointer', fontSize: mobile ? 13.5 : 14, fontWeight: 500, whiteSpace: 'nowrap',
        }}>
        <span style={{ marginLeft: mobile ? 3 : 4 }}><Dots colors={p.ctaDots} size={mobile ? 10 : 12} overlap={mobile ? 3 : 4} ring={bg} /></span>
        {mobile ? 'Your edit' : 'Your style edit'}
      </button>
    );
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
      {!p.isMobile ? (
        <div style={{ height: 62, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', alignItems: 'center', gap: 32, padding: `0 ${p.padX}px` }}>
          <button className="btn-reset serif" onClick={p.goHome} aria-label="Hue — back to Discover" style={{ fontSize: 34, lineHeight: 1, letterSpacing: '-0.01em' }}>Hue</button>
          {p.searchOpen ? searchField(false) : (
            <nav aria-label="Categories" className="no-scrollbar" style={{ display: 'flex', gap: 24, overflowX: 'auto', alignItems: 'center', height: 62 }}>
              {p.nav.map((n) => (
                <button key={n.label} className="nav-link" onClick={n.onClick} aria-current={n.active ? 'page' : undefined}>{n.label}</button>
              ))}
            </nav>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="icon-btn" aria-label="Search" aria-expanded={p.searchOpen} onClick={p.toggleSearch}><SearchIcon /></button>
            <button className="icon-btn" aria-label="Filters" aria-expanded={p.filterOpen} onClick={p.toggleFilter} style={{ position: 'relative' }}>
              <FilterIcon />
              {p.filtersActive && <span style={{ position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 999, background: 'var(--dot)' }} />}
            </button>
            <button className="icon-btn" aria-label={`Saved pieces, ${p.savedCount}`} onClick={p.showSaved} style={{ width: 'auto', padding: '0 12px 0 10px', display: 'flex', gap: 6, fontSize: 13 }}>
              <HeartIcon /><span>{p.savedCount}</span>
            </button>
            {p.personalized ? personalizedBtn(false) : (
              <button className="btn-dark" onClick={p.openUpload} style={{ marginLeft: 8, height: 40, padding: '0 18px 0 14px', fontSize: 14, fontWeight: 500 }}>
                <Dots colors={DEFAULT_DOTS} size={12} overlap={4} />
                Personalize my feed
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ height: 54, display: 'flex', alignItems: 'center', gap: 2, padding: '0 6px 0 14px' }}>
            <button className="btn-reset serif" onClick={p.goHome} aria-label="Hue — back to Discover" style={{ fontSize: 30, lineHeight: 1, marginRight: 'auto' }}>Hue</button>
            <button className="icon-btn" aria-label="Search" aria-expanded={p.searchOpen} onClick={p.toggleSearch} style={{ width: 44, height: 44 }}><SearchIcon size={20} /></button>
            <button className="icon-btn" aria-label={`Saved pieces, ${p.savedCount}`} onClick={p.showSaved} style={{ width: 44, height: 44 }}><HeartIcon size={20} /></button>
            {p.personalized ? personalizedBtn(true) : (
              <button className="btn-dark" onClick={p.openUpload} style={{ height: 38, padding: '0 14px 0 11px', gap: 8, fontSize: 13.5, fontWeight: 500 }}>
                <Dots colors={DEFAULT_DOTS} size={10} overlap={3} />
                Personalize
              </button>
            )}
          </div>
          {p.searchOpen ? searchField(true) : (
            <nav aria-label="Categories" className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 10px 10px' }}>
              <button className="chip" aria-label="Filters" aria-expanded={p.filterOpen} onClick={p.toggleFilter}
                style={{ flex: 'none', height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, position: 'relative' }}>
                <FilterIcon size={15} sw={1.8} />Filter
                {p.filtersActive && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--dot)' }} />}
              </button>
              {p.nav.map((n) => (
                <button key={n.label} className="chip" onClick={n.onClick} aria-current={n.active ? 'page' : undefined}
                  style={{ flex: 'none', height: 36, padding: '0 14px', fontSize: 13 }}>{n.label}</button>
              ))}
            </nav>
          )}
        </>
      )}
      {p.filterOpen && p.filterPanel}
    </header>
  );
}

interface FilterProps {
  padX: number;
  gender: string;
  price: string;
  setGender: (g: string) => void;
  setPrice: (p: string) => void;
  /** Sort options the current provider supports, as display labels. */
  sorts: string[];
  sort: string;
  setSort: (s: string) => void;
  clear: () => void;
  close: () => void;
}

export function FilterPanel(p: FilterProps) {
  const group = (label: string, opts: string[], value: string, set: (v: string) => void) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="eyebrow">{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opts.map((o) => (
          <button key={o} className="chip" aria-pressed={value === o} onClick={() => set(o)} style={{ minHeight: 38, padding: '0 14px', fontSize: 13 }}>{o}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div role="dialog" aria-label="Filters" style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: p.padX, width: 'min(340px, calc(100% - 20px))', background: 'var(--bg)',
      border: '1px solid var(--line)', borderRadius: 'var(--radius-modal)', boxShadow: '0 18px 50px rgba(31,29,26,.14)', padding: 20,
      display: 'flex', flexDirection: 'column', gap: 18, animation: 'hueFade .2s ease both',
    }}>
      {group('Shop', ['All', 'Women', 'Men', 'Unisex'], p.gender, p.setGender)}
      {group('Price', ['Any', 'Under $90', '$90–180', '$180+'], p.price, p.setPrice)}
      {p.sorts.length > 1 && group('Sort', p.sorts, p.sort, p.setSort)}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <button className="btn-reset" onClick={p.clear} style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Clear</button>
        <button className="btn-dark" onClick={p.close} style={{ height: 38, padding: '0 18px', fontSize: 13 }}>Done</button>
      </div>
    </div>
  );
}
