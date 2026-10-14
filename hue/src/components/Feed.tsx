import { useRef, useState } from 'react';
import { FAM, type Item } from '../data';
import { money, placeholderBg, tone } from '../lib';
import { ChevronLeft, ChevronRight, ExternalIcon, HeartIcon } from './Icons';

export interface FeedEntry { item: Item; key: string; reason: string }
export type Block =
  | { kind: 'grid'; key: string; entries: FeedEntry[] }
  | { kind: 'row'; key: string; title: string; sub: string; entries: FeedEntry[] };

interface TileCtx {
  isMobile: boolean;
  alwaysDetails: boolean;
  saved: string[];
  onOpen: (id: string) => void;
  onSave: (id: string) => void;
}

export const priceLabel = (it: Item) => (it.price == null ? 'Shop the look' : money(it.price));

/** Relative height used to balance masonry columns (image ratio + caption/reason). */
export const entryHeight = (e: FeedEntry, captions: boolean) => e.item.ratio + (e.reason ? 0.2 : 0) + (captions ? 0.14 : 0) + 0.06;

function SaveButton({ item, saved, onSave, size }: { item: Item; saved: boolean; onSave: (id: string) => void; size: number }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSave(item.id); }}
      aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
      aria-pressed={saved}
      style={{ position: 'absolute', top: 8, right: 8, width: size, height: size, borderRadius: 999, border: 0, background: 'var(--bg)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink)' }}>
      <HeartIcon size={size === 36 ? 17 : 16} sw={1.7} filled={saved} />
    </button>
  );
}

function Tile({ entry, ctx }: { entry: FeedEntry; ctx: TileCtx }) {
  const { item: it, reason } = entry;
  const [hoverState, setHover] = useState(false);
  const hover = !ctx.isMobile && hoverState;
  const t = tone(FAM[it.fams[0]][1]);
  const saved = ctx.saved.includes(it.id);
  const caption = ctx.alwaysDetails || ctx.isMobile;
  const label = priceLabel(it);
  const open = () => ctx.onOpen(it.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div
        role="button" tabIndex={0} aria-label={`${it.name}, ${it.brand}, ${label}`}
        onClick={open}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}
        style={{ position: 'relative', aspectRatio: `1 / ${it.ratio}`, ...placeholderBg(t), cursor: 'pointer', overflow: 'hidden', borderRadius: 'var(--radius-tile)' }}>
        <div className="shot-label" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, color: t.fg, opacity: hover ? 0 : 0.72 }}>photo — {it.shot}</div>
        {it.tag && !hover && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--bg)', color: 'var(--ink)', fontSize: 11, letterSpacing: '.02em', padding: '4px 8px', borderRadius: 2 }}>{it.tag}</span>
        )}
        {(hover || saved || ctx.isMobile) && <SaveButton item={it} saved={saved} onSave={ctx.onSave} size={36} />}
        {hover && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, background: 'var(--bg)', borderRadius: 'var(--radius-tile)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 8, animation: 'hueFade .18s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="pretty" style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.25 }}>{it.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{it.brand}</span>
              </div>
              <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {it.fams.map((f) => (
                  <span key={f} title={FAM[f][0]} style={{ width: 13, height: 13, borderRadius: 999, background: FAM[f][1], boxShadow: 'inset 0 0 0 1px rgba(31,29,26,.15)' }} />
                ))}
              </div>
              {it.unavailable ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Unavailable</span>
              ) : (
                <a href={it.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                  {it.retailer}<ExternalIcon />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      {caption && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, lineHeight: 1.3, padding: '0 2px' }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 500 }}>{it.brand}</span> <span style={{ color: 'var(--muted)' }}>{it.name}</span>
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
  const columns = masonry(entries, cols, ctx.alwaysDetails || ctx.isMobile);
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
        {entries.map(({ item: it, key }) => {
          const t = tone(FAM[it.fams[0]][1]);
          const saved = ctx.saved.includes(it.id);
          const open = () => ctx.onOpen(it.id);
          return (
            <div key={key} style={{ flex: 'none', width: Math.round(rowH / it.ratio), scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div role="button" tabIndex={0} aria-label={`${it.name}, ${it.brand}, ${priceLabel(it)}`} onClick={open}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
                style={{ position: 'relative', height: rowH, ...placeholderBg(t), borderRadius: 'var(--radius-tile)', cursor: 'pointer', overflow: 'hidden' }}>
                <div className="shot-label" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, color: t.fg, opacity: 0.72 }}>photo — {it.shot}</div>
                <SaveButton item={it} saved={saved} onSave={ctx.onSave} size={34} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12.5, lineHeight: 1.3, padding: '0 2px' }}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                <span style={{ color: 'var(--muted)' }}>{it.brand} · {priceLabel(it)}</span>
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

export function Skeleton({ cols, gap, padX }: { cols: number; gap: number; padX: number }) {
  return (
    <div aria-live="polite" aria-label="Loading more pieces" style={{ padding: `0 ${padX}px`, display: 'flex', gap, alignItems: 'flex-start' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: [260, 340, 220, 300, 280][i % 5], borderRadius: 'var(--radius-tile)', background: 'var(--skeleton)', animation: `huePulse 1.2s ease-in-out ${i * 0.12}s infinite` }} />
      ))}
    </div>
  );
}
