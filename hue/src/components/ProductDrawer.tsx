import { useEffect, useRef, useState } from 'react';
import { BRAND_STYLE, DESC, FAM, ITEMS, NAV_LABEL, SIZES, type Item, type Palette, type Prefs } from '../data';
import { fname, money, placeholderBg, reasonFor, tone } from '../lib';
import { useDialogFocus } from '../hooks';
import { CloseIcon, ExternalIcon, HeartIcon } from './Icons';

interface Props {
  item: Item;
  sheet: boolean;
  personalized: boolean;
  pal: Palette;
  prefs: Prefs;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  onOpen: (id: string) => void;
}

export function ProductDrawer({ item: pi, sheet, personalized, pal, prefs, saved, onSave, onClose, onOpen }: Props) {
  const ref = useDialogFocus<HTMLElement>();
  const [dColor, setColor] = useState(0);
  const [dSize, setSize] = useState<string | null>(null);
  const first = useRef(true);
  useEffect(() => {
    // Opening a similar piece swaps content in place: reset selections and scroll.
    if (first.current) { first.current = false; return; }
    setColor(0); setSize(null);
    ref.current?.scrollTo({ top: 0 });
  }, [pi.id, ref]);

  const ci = Math.min(dColor, pi.fams.length - 1);
  const t = tone(FAM[pi.fams[ci]][1]);
  const isLook = pi.cat === 'Outfits';
  const sim = isLook
    ? ITEMS.filter((x) => x.cat !== 'Outfits' && x.fams.some((f) => pi.fams.includes(f))).slice(0, 4)
    : ITEMS.filter((x) => x.id !== pi.id && (x.cat === pi.cat || x.fams[0] === pi.fams[0]))
      .sort((a, b) => Number(b.fams[0] === pi.fams[0]) - Number(a.fams[0] === pi.fams[0])).slice(0, 4);
  const lookTotal = isLook ? sim.reduce((a, x) => a + (x.price || 0), 0) : 0;
  const pickedStyle = prefs.styles.find((x) => (BRAND_STYLE[pi.brand] || []).includes(x));
  const why = personalized
    ? reasonFor(pi, pal) + (pickedStyle ? ` It also suits the ${pickedStyle.toLowerCase()} style you picked.` : '')
    : pi.fams.length > 1
      ? `Wear the ${fname(pi.fams[0]).toLowerCase()} with ${fname(pi.fams[1]).toLowerCase()} for an easy, tonal look.`
      : 'Let it lead — keep the rest of the outfit neutral.';
  const sizes = SIZES[pi.cat];
  const retailer = isLook ? `${sim[0]?.brand ?? 'several stores'} & others` : pi.retailer;
  const similar = sim.filter((x) => !x.unavailable);

  const style: React.CSSProperties = sheet
    ? { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', overflowY: 'auto', background: 'var(--bg)', borderRadius: '16px 16px 0 0', animation: 'hueSheet .3s var(--ease-out) both' }
    : { position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(580px, 94%)', overflowY: 'auto', background: 'var(--bg)', boxShadow: '-24px 0 60px rgba(31,29,26,.14)', animation: 'hueSlide .3s var(--ease-out) both' };

  return (
    <div className="overlay" style={{ zIndex: 60 }}>
      <div className="scrim" onClick={onClose} style={{ background: 'rgba(31,29,26,.4)' }} />
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={pi.name} style={style}>
        <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 10px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
          <span className="eyebrow">{NAV_LABEL[pi.cat] || pi.cat}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-outline" onClick={onSave} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save'} style={{ height: 40, padding: '0 14px', gap: 7, fontSize: 13 }}>
              <HeartIcon size={16} sw={1.7} filled={saved} />{saved ? 'Saved' : 'Save'}
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
          </div>
        </div>

        <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative', aspectRatio: '5 / 6', ...placeholderBg(t), borderRadius: 'var(--radius-tile)', transition: 'background-color .3s ease' }}>
            <div className="mono" style={{ position: 'absolute', left: 16, bottom: 16, right: 16, fontSize: 11, lineHeight: 1.5, color: t.fg, opacity: 0.75 }}>
              photo — {pi.shot} · {fname(pi.fams[ci]).toLowerCase()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            {(['detail', 'on model', 'back'] as const).map((l, j) => {
              const tt = tone(FAM[pi.fams[j % pi.fams.length]][1]);
              return (
                <div key={l} style={{ position: 'relative', aspectRatio: '1 / 1', ...placeholderBg(tt), borderRadius: 'var(--radius-tile)' }}>
                  <span className="mono" style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10, color: tt.fg, opacity: 0.75 }}>{l}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '22px 20px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.01em' }}>{pi.brand}</span>
            <h2 className="serif pretty" style={{ fontSize: 36, lineHeight: 1.05 }}>{pi.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{ fontSize: 17 }}>{isLook ? `Look from ${money(lookTotal)}` : money(pi.price ?? 0)}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{isLook ? `${sim.length} pieces · each sold by its own retailer` : `USD · as listed by ${pi.retailer}`}</span>
            </div>
          </div>

          {pi.unavailable && (
            <div role="status" style={{ background: 'var(--notice)', borderRadius: 'var(--radius-panel)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>No longer available at {retailer}</span>
              <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.45 }}>The retailer has sold out or removed this item. We've kept it here so you can find something close — see similar pieces below.</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>Color</span> · {fname(pi.fams[ci])}</div>
            <div role="group" aria-label="Color" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pi.fams.map((f, j) => {
                const on = j === ci;
                return (
                  <button key={f} onClick={() => setColor(j)} aria-label={fname(f)} aria-pressed={on}
                    style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: FAM[f][1], cursor: 'pointer', boxShadow: `inset 0 0 0 1px rgba(31,29,26,.14), 0 0 0 ${on ? 2 : 0}px var(--bg), 0 0 0 ${on ? 3.5 : 0}px var(--ink)` }} />
                );
              })}
            </div>
          </div>

          {sizes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sizes listed by retailer</div>
              <div role="group" aria-label="Size" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {sizes.map((z) => (
                  <button key={z} className="size-chip" aria-pressed={dSize === z} onClick={() => setSize(z)}>{z}</button>
                ))}
              </div>
            </div>
          )}

          <p className="pretty" style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-2)' }}>{DESC[pi.cat]}</p>

          <div style={{ background: 'var(--panel)', borderRadius: 'var(--radius-panel)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="eyebrow">{personalized ? "Why it's in your edit" : 'Styling note'}</span>
            <span className="serif pretty" style={{ fontSize: 20, lineHeight: 1.3 }}>{why}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pi.unavailable ? (
              <button disabled style={{ height: 52, borderRadius: 999, background: 'var(--line)', color: 'var(--muted)', border: 0, fontSize: 15, cursor: 'not-allowed' }}>Unavailable at {retailer}</button>
            ) : (
              <a className="btn-dark" href={pi.url} target="_blank" rel="noopener noreferrer" style={{ height: 52, gap: 8, fontSize: 15, fontWeight: 500 }}>
                View at {retailer}<ExternalIcon size={15} />
              </a>
            )}
            <span className="pretty" style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
              Hue doesn't sell this item. You'll complete your purchase on {retailer}'s site, where price and stock may differ.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
            <h3 className="serif" style={{ fontSize: 24 }}>{isLook ? 'Pieces in this look' : pi.unavailable ? 'Similar, still available' : 'Similar pieces'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {similar.map((x) => (
                <button key={x.id} className="btn-reset" onClick={() => onOpen(x.id)} style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                  <div style={{ width: '100%', aspectRatio: '4 / 5', ...placeholderBg(tone(FAM[x.fams[0]][1])), borderRadius: 'var(--radius-tile)' }} />
                  <span style={{ fontSize: 12.5, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 500 }}>{x.name}</span><br />
                    <span style={{ color: 'var(--muted)' }}>{x.brand} · {x.price == null ? 'Look' : money(x.price)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
