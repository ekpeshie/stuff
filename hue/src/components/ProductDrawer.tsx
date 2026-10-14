import { useEffect, useRef, useState } from 'react';
import { FAM, NAV_LABEL, type Palette } from '../data';
import { formatPrice, isPriceStale, type Product, type ProviderInfo } from '../../shared/product';
import type { ProductSource } from '../products/source';
import { isSoldOut, priceLabel, reasonFor } from '../lib';
import { useDialogFocus } from '../hooks';
import { brandLine, ProductImage, SampleBadge } from './Feed';
import { CloseIcon, ExternalIcon, HeartIcon } from './Icons';

interface Props {
  product: Product;
  info: ProviderInfo | null;
  source: ProductSource;
  /** Already-loaded products to draw similar pieces from. */
  pool: Product[];
  sheet: boolean;
  personalized: boolean;
  pal: Palette;
  saved: boolean;
  onSave: (p: Product) => void;
  onClose: () => void;
  onOpen: (p: Product) => void;
}

type Check = 'checking' | 'current' | 'gone' | 'error';

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 2) return 'just now';
  if (m < 90) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  return h < 36 ? `${h} hours ago` : `${Math.round(h / 24)} days ago`;
};

export function ProductDrawer({ product: initial, info: initialInfo, source, pool, sheet, personalized, pal, saved, onSave, onClose, onOpen }: Props) {
  const ref = useDialogFocus<HTMLElement>();
  const [p, setP] = useState(initial);
  const [info, setInfo] = useState(initialInfo);
  const [check, setCheck] = useState<Check>(initial.isSample ? 'current' : 'checking');
  const [dColor, setColor] = useState(0);
  const [dSize, setSize] = useState<string | null>(null);
  const first = useRef(true);

  // Re-check price and availability with the provider each time a product is opened.
  useEffect(() => {
    setP(initial); setInfo(initialInfo); setColor(0); setSize(null);
    if (first.current) first.current = false; else ref.current?.scrollTo({ top: 0 });
    if (initial.isSample) { setCheck('current'); return; }
    setCheck('checking');
    const c = new AbortController();
    source.get(initial.id, c.signal).then(
      (r) => {
        if (!r.product) return setCheck('gone');
        setP(r.product); if (r.source) setInfo(r.source); setCheck('current');
      },
      (e) => { if ((e as Error).name !== 'AbortError') setCheck('error'); },
    );
    return () => c.abort();
  }, [initial, initialInfo, source, ref]);

  const ci = Math.min(dColor, Math.max(0, p.colors.length - 1));
  const unavailable = check === 'gone' || isSoldOut(p);
  const stale = !p.isSample && !!info && isPriceStale(p, info);
  const linkable = !p.isSample && !!p.retailer.productUrl && !unavailable;
  const retailer = p.retailer.name || 'the retailer';
  const why = personalized ? reasonFor(p, pal) : '';
  const similar = pool
    .filter((x) => x.id !== p.id && !isSoldOut(x) && x.category === p.category)
    .sort((a, b) => Number(b.colors.some((c) => c.family && p.colors.some((d) => d.family === c.family))) - Number(a.colors.some((c) => c.family && p.colors.some((d) => d.family === c.family))))
    .slice(0, 4);

  const drawerStyle: React.CSSProperties = sheet
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', overflowY: 'auto', background: 'var(--bg)', borderRadius: '16px 16px 0 0', animation: 'hueSheet .3s var(--ease-out) both' }
    : { position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(580px, 94%)', overflowY: 'auto', background: 'var(--bg)', boxShadow: '-24px 0 60px rgba(31,29,26,.14)', animation: 'hueSlide .3s var(--ease-out) both' };

  const price = formatPrice(p.price);
  return (
    <div className="overlay" style={{ zIndex: 60 }}>
      <div className="scrim" onClick={onClose} style={{ background: 'rgba(31,29,26,.4)' }} />
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={p.name} style={drawerStyle}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 10px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {p.isSample && <SampleBadge />}
            <span className="eyebrow">{p.category ? NAV_LABEL[p.category] || p.category : p.rawCategory || 'Product'}</span>
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-outline" onClick={() => onSave(p)} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save'} style={{ height: 40, padding: '0 14px', gap: 7, fontSize: 13 }}>
              <HeartIcon size={16} sw={1.7} filled={saved} />{saved ? 'Saved' : 'Save'}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ position: 'relative', aspectRatio: '5 / 6', borderRadius: 'var(--radius-tile)', overflow: 'hidden' }}>
            <ProductImage key={p.id} p={p} colorIndex={ci} style={{ transition: 'background-color .3s ease' }}
              label={p.sample ? `photo — ${p.sample.shot}${p.colors[ci] ? ' · ' + p.colors[ci].name.toLowerCase() : ''}` : undefined} />
          </div>
        </div>

        <div style={{ padding: '22px 20px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brandLine(p) && <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.01em' }}>{brandLine(p)}</span>}
            <h2 className="serif pretty" style={{ fontSize: 36, lineHeight: 1.05 }}>{p.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{ fontSize: 17 }}>{priceLabel(p, info)}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }} aria-live="polite">
                {p.isSample ? 'Sample price — illustrative only'
                  : check === 'checking' ? 'Checking with the retailer…'
                  : stale || check === 'error' ? `Last checked ${ago(p.fetchedAt)} — may have changed`
                  : price ? `${p.price!.currency} · checked ${ago(p.fetchedAt)}${p.retailer.name ? ` · as listed by ${p.retailer.name}` : ''}` : ''}
              </span>
            </div>
          </div>

          {p.isSample && (
            <div role="note" style={{ background: 'var(--panel)', borderRadius: 'var(--radius-panel)', padding: '14px 16px', fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.45 }}>
              This is a sample product for demonstration. It isn't real inventory, its brand and price are illustrative, and it has no retailer link.
            </div>
          )}

          {unavailable && (
            <div role="status" style={{ background: 'var(--notice)', borderRadius: 'var(--radius-panel)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{check === 'gone' ? `No longer listed by ${retailer}` : `Sold out at ${retailer}`}</span>
              <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.45 }}>
                {check === 'gone' ? 'The retailer has removed this item.' : 'The retailer reports this item as out of stock.'} See similar pieces below.
              </span>
            </div>
          )}
          {check === 'error' && !unavailable && (
            <div role="status" style={{ background: 'var(--panel)', borderRadius: 'var(--radius-panel)', padding: '14px 16px', fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.45 }}>
              We couldn't re-check this item with the retailer just now. Price and stock may have changed.
            </div>
          )}

          {p.colors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>{p.colors.length > 1 ? 'Colors listed' : 'Color'}</span> · {p.colors[ci].name}</div>
              {p.colors.length > 1 && (
                <div role="group" aria-label="Color" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.colors.map((c, j) => {
                    const on = j === ci;
                    return (
                      <button key={c.name} onClick={() => setColor(j)} aria-label={c.name} aria-pressed={on} title={c.name}
                        style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: c.family ? FAM[c.family][1] : 'var(--panel)', cursor: 'pointer', fontSize: 10, boxShadow: `inset 0 0 0 1px rgba(31,29,26,.14), 0 0 0 ${on ? 2 : 0}px var(--bg), 0 0 0 ${on ? 3.5 : 0}px var(--ink)` }}>
                        {c.family ? '' : c.name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {p.sizes && p.sizes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sizes listed by {p.isSample ? 'the sample' : retailer} — check stock on their site</div>
              <div role="group" aria-label="Size" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {p.sizes.map((z) => (
                  <button key={z} className="size-chip" aria-pressed={dSize === z} onClick={() => setSize(z)}>{z}</button>
                ))}
              </div>
            </div>
          )}

          {p.description && <p className="pretty" style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{p.description}</p>}

          {why && (
            <div style={{ background: 'var(--panel)', borderRadius: 'var(--radius-panel)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="eyebrow">Why it's in your edit</span>
              <span className="serif pretty" style={{ fontSize: 20, lineHeight: 1.3 }}>{why}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {linkable ? (
              <a className="btn-dark" href={p.retailer.productUrl!} target="_blank" rel="noopener noreferrer sponsored" style={{ height: 52, gap: 8, fontSize: 15, fontWeight: 500 }}>
                View at {p.retailer.name || 'retailer'}<ExternalIcon size={15} />
              </a>
            ) : (
              <button disabled style={{ height: 52, borderRadius: 999, background: 'var(--line)', color: 'var(--muted)', border: 0, fontSize: 15, cursor: 'not-allowed' }}>
                {p.isSample ? 'Sample product — no retailer link' : unavailable ? `Unavailable at ${retailer}` : 'No retailer link provided'}
              </button>
            )}
            {!p.isSample && (
              <span className="pretty" style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                Hue doesn't sell this item. You'll buy it on {retailer}'s site, where price and stock may differ. Hue may earn a commission from this link.
              </span>
            )}
          </div>

          {similar.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
              <h3 className="serif" style={{ fontSize: 24 }}>{unavailable ? 'Similar, still available' : 'Similar pieces'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                {similar.map((x) => (
                  <button key={x.id} className="btn-reset" onClick={() => onOpen(x)} style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', borderRadius: 'var(--radius-tile)', overflow: 'hidden' }}>
                      <ProductImage p={x} label="" />
                      {x.isSample && <SampleBadge style={{ position: 'absolute', top: 8, left: 8 }} />}
                    </div>
                    <span style={{ fontSize: 12.5, lineHeight: 1.3 }}>
                      <span style={{ fontWeight: 500 }}>{x.name}</span><br />
                      <span style={{ color: 'var(--muted)' }}>{[brandLine(x), priceLabel(x, info)].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
