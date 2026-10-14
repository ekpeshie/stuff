import { useRef, useState } from 'react';
import { FAM } from '../data';
import type { Product, ProviderInfo } from '../../shared/product';
import { isSoldOut, placeholderBg, priceLabel, productRatio, productTone } from '../lib';
import { ChevronLeft, ChevronRight, ExternalIcon, HeartIcon } from './Icons';

export interface FeedEntry { product: Product; key: string; reason: string }
export type Block =
  | { kind: 'grid'; key: string; entries: FeedEntry[] }
  | { kind: 'row'; key: string; title: string; sub: string; entries: FeedEntry[] };

interface TileCtx {
  isMobile: boolean;
  saved: string[];
  info: ProviderInfo | null;
  onOpen: (p: Product) => void;
  onSave: (p: Product) => void;
}

/** Relative height used to balance masonry columns (image ratio + caption/reason). */
const entryHeight = (e: FeedEntry, captions: boolean) => productRatio(e.product) + (e.reason ? 0.2 : 0) + (captions ? 0.14 : 0) + 0.06;

/**
 * The product image when the provider allows displaying it, otherwise (or if it fails to
 * load) the striped placeholder. Sample products always use the placeholder art.
 */
export function ProductImage({ p, colorIndex = 0, label, labelHidden, style }: { p: Product; colorIndex?: number; label?: string; labelHidden?: boolean; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  const t = productTone(p, colorIndex);
  const showImg = !!p.imageUrl && !failed;
  const text = label ?? (p.sample ? `photo — ${p.sample.shot}` : failed ? 'image unavailable' : 'no image from retailer');
  return (
    <div style={{ position: 'absolute', inset: 0, ...(showImg ? { background: 'var(--skeleton)' } : placeholderBg(t)), ...style }}>
      {showImg ? (
        <img src={p.imageUrl!} alt={p.name} loading="lazy" decoding="async" onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
      ) : (
        <div className="shot-label" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, color: t.fg, opacity: labelHidden ? 0 : 0.72 }}>{text}</div>
      )}
    </div>
  );
}

export const SampleBadge = ({ style }: { style?: React.CSSProperties }) => (
  <span className="mono" style={{ background: 'var(--ink)', color: 'var(--bg)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', padding: '4px 7px', borderRadius: 2, ...style }}>Sample</span>
);

function SaveButton({ p, saved, onSave, size }: { p: Product; saved: boolean; onSave: (p: Product) => void; size: number }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSave(p); }}
      aria-label={saved ? `Remove ${p.name} from saved` : `Save ${p.name}`}
      aria-pressed={saved}
      style={{ position: 'absolute', top: 8, right: 8, width: size, height: size, borderRadius: 999, border: 0, background: 'var(--bg)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink)' }}>
      <HeartIcon size={size === 36 ? 17 : 16} sw={1.7} filled={saved} />
    </button>
  );
}

const tagFor = (p: Product) => (isSoldOut(p) ? 'Sold out' : p.sample?.tag ?? null);
export const brandLine = (p: Product) => p.brand ?? p.retailer.name ?? '';

function Tile({ entry, ctx }: { entry: FeedEntry; ctx: TileCtx }) {
  const { product: p, reason } = entry;
  const [hoverState, setHover] = useState(false);
  const hover = !ctx.isMobile && hoverState;
  const saved = ctx.saved.includes(p.id);
  const label = priceLabel(p, ctx.info);
  const tag = tagFor(p);
  const open = () => ctx.onOpen(p);
  const linkable = !p.isSample && !!p.retailer.productUrl && !isSoldOut(p);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div
        role="button" tabIndex={0} aria-label={`${p.isSample ? 'Sample: ' : ''}${p.name}${p.brand ? `, ${p.brand}` : ''}, ${label}`}
        onClick={open}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}
        style={{ position: 'relative', aspectRatio: `1 / ${productRatio(p)}`, cursor: 'pointer', overflow: 'hidden', borderRadius: 'var(--radius-tile)' }}>
        <ProductImage p={p} labelHidden={hover} />
        {!hover && (tag || p.isSample) && (
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4 }}>
            {p.isSample && <SampleBadge />}
            {tag && <span style={{ background: 'var(--bg)', color: 'var(--ink)', fontSize: 11, letterSpacing: '.02em', padding: '4px 8px', borderRadius: 2 }}>{tag}</span>}
          </div>
        )}
        {(hover || saved || ctx.isMobile) && <SaveButton p={p} saved={saved} onSave={ctx.onSave} size={36} />}
        {hover && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, background: 'var(--bg)', borderRadius: 'var(--radius-tile)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 8, animation: 'hueFade .18s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="pretty" style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.25 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.isSample ? `${p.brand} · sample` : brandLine(p)}</span>
              </div>
              <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {p.colors.slice(0, 6).map((c) => (
                  <span key={c.name} title={c.name} style={{ width: 13, height: 13, borderRadius: 999, background: c.family ? FAM[c.family][1] : 'transparent', boxShadow: 'inset 0 0 0 1px rgba(31,29,26,.25)' }} />
                ))}
              </div>
              {linkable ? (
                <a href={p.retailer.productUrl!} target="_blank" rel="noopener noreferrer sponsored" onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                  {p.retailer.name || 'View at retailer'}<ExternalIcon />
                </a>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.isSample ? 'No retailer link' : isSoldOut(p) ? 'Unavailable' : ''}</span>
              )}
            </div>
          </div>
        )}
      </div>
      {ctx.isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, lineHeight: 1.3, padding: '0 2px' }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {brandLine(p) && <span style={{ fontWeight: 500 }}>{brandLine(p)} </span>}<span style={{ color: 'var(--muted)' }}>{p.name}</span>
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        </div>
      )}
      {reason && (
        <div className="serif pretty" style={{ fontStyle: 'italic', fontSize: 16, lineHeight: 1.3, color: 'var(--text-3)', padding: '0 2px 4px' }}>{reason}</div>
      )}
    </div>
  );
}

function masonry(entries: FeedEntry[], cols: number, captions: boolean) {
  const c = Array.from({ length: cols }, () => ({ items: [] as FeedEntry[], h: 0 }));
  entries.forEach((e) => {
    let m = 0;
    for (let i = 1; i < cols; i++) if (c[i].h < c[m].h - 0.01) m = i;
    c[m].items.push(e);
    c[m].h += entryHeight(e, captions);
  });
  return c.map((x) => x.items);
}

function Grid({ entries, cols, gap, padX, ctx }: { entries: FeedEntry[]; cols: number; gap: number; padX: number; ctx: TileCtx }) {
  const columns = masonry(entries, cols, ctx.isMobile);
  return (
    <div style={{ display: 'flex', gap, alignItems: 'flex-start', padding: `0 ${padX}px`, marginBottom: gap }}>
      {columns.map((col, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap }}>
          {col.map((e) => <Tile key={e.key} entry={e} ctx={ctx} />)}
        </div>
      ))}
    </div>
  );
}

function Row({ title, sub, entries, gap, padX, ctx }: { title: string; sub: string; entries: FeedEntry[]; gap: number; padX: number; ctx: TileCtx }) {
  const track = useRef<HTMLDivElement>(null);
  const rowH = ctx.isMobile ? 220 : 300;
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section aria-label={title} style={{ margin: '26px 0 34px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, padding: `0 ${padX}px`, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.05 }}>{title}</h2>
          <span className="pretty" style={{ fontSize: 13, color: 'var(--muted)' }}>{sub}</span>
        </div>
        {!ctx.isMobile && (
          <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
            <button className="btn-outline" onClick={() => scroll(-1)} aria-label="Scroll left" style={{ width: 40, height: 40 }}><ChevronLeft /></button>
            <button className="btn-outline" onClick={() => scroll(1)} aria-label="Scroll right" style={{ width: 40, height: 40 }}><ChevronRight /></button>
          </div>
        )}
      </div>
      <div ref={track} className="no-scrollbar" style={{ display: 'flex', gap, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPadding: `0 ${padX}px`, padding: `0 ${padX}px 4px` }}>
        {entries.map(({ product: p, key }) => {
          const open = () => ctx.onOpen(p);
          return (
            <div key={key} style={{ flex: 'none', width: Math.round(rowH / productRatio(p)), scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div role="button" tabIndex={0} aria-label={`${p.isSample ? 'Sample: ' : ''}${p.name}, ${priceLabel(p, ctx.info)}`} onClick={open}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
                style={{ position: 'relative', height: rowH, borderRadius: 'var(--radius-tile)', cursor: 'pointer', overflow: 'hidden' }}>
                <ProductImage p={p} />
                {(p.isSample || isSoldOut(p)) && (
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4 }}>
                    {p.isSample && <SampleBadge />}
                    {isSoldOut(p) && <span style={{ background: 'var(--bg)', fontSize: 11, padding: '4px 8px', borderRadius: 2 }}>Sold out</span>}
                  </div>
                )}
                <SaveButton p={p} saved={ctx.saved.includes(p.id)} onSave={ctx.onSave} size={34} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12.5, lineHeight: 1.3, padding: '0 2px' }}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[brandLine(p), priceLabel(p, ctx.info)].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface FeedProps extends TileCtx {
  blocks: Block[];
  cols: number;
  gap: number;
  padX: number;
}

export function Feed({ blocks, cols, gap, padX, ...ctx }: FeedProps) {
  return (
    <>
      {blocks.map((b) =>
        b.kind === 'grid'
          ? <Grid key={b.key} entries={b.entries} cols={cols} gap={gap} padX={padX} ctx={ctx} />
          : <Row key={b.key} title={b.title} sub={b.sub} entries={b.entries} gap={gap} padX={padX} ctx={ctx} />,
      )}
    </>
  );
}

export function Skeleton({ cols, gap, padX, rows = 1 }: { cols: number; gap: number; padX: number; rows?: number }) {
  return (
    <div role="status" aria-label="Loading pieces" style={{ padding: `0 ${padX}px`, display: 'flex', gap, alignItems: 'flex-start' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap }}>
          {Array.from({ length: rows }).map((__, r) => (
            <div key={r} style={{ height: [260, 340, 220, 300, 280][(i + r * 2) % 5], borderRadius: 'var(--radius-tile)', background: 'var(--skeleton)', animation: `huePulse 1.2s ease-in-out ${i * 0.12}s infinite` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
