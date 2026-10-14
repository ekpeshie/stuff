import { useState } from 'react';
import { COMBO_NOTES, ITEMS, type Fam, type Palette } from '../data';
import { fname, hexOf } from '../lib';
import { useDialogFocus } from '../hooks';
import { CheckIcon, ChevronLeft, CopyIcon } from './Icons';

interface Props {
  pal: Palette;
  isMobile: boolean;
  padX: number;
  initialSel: Fam[];
  onApply: (fams: Fam[]) => void;
  onClose: () => void;
}

export function PaletteExplorer({ pal, isMobile, padX, initialSel, onApply, onClose }: Props) {
  const ref = useDialogFocus<HTMLDivElement>();
  const [sel, setSel] = useState<Fam[]>(initialSel);
  const [copied, setCopied] = useState<string | null>(null);

  const toggle = (f: Fam) => setSel((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f].slice(-3)));
  const copy = (hex: string) => {
    navigator.clipboard?.writeText(hex).catch(() => {});
    setCopied(hex);
    window.setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1600);
  };
  const selCount = ITEMS.filter((it) => it.fams.some((f) => sel.includes(f))).length;

  const groups: [string, string, Fam[], boolean][] = [
    ['Recommended', 'Colors likely to look most natural near your face.', pal.rec, true],
    ['Versatile neutrals', 'Foundations that work with everything here.', pal.neu, false],
    ['Accents', 'For a scarf, a shoe, one statement piece.', pal.acc, false],
    ['Worth experimenting with', 'Less expected — try them away from the face, or beside a neutral.', pal.alt, false],
  ];

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Your colors" className="fullscreen" style={{ zIndex: 75, animation: 'hueSheet .32s var(--ease-out) both' }}>
      <div className="topbar" style={{ padding: `0 ${padX}px` }}>
        <button className="icon-btn" onClick={onClose} style={{ width: 'auto', padding: '0 14px 0 10px', display: 'flex', gap: 6, fontSize: 14 }}><ChevronLeft />Back to your edit</button>
        <span className="serif" style={{ fontSize: 28 }}>Hue</span>
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: isMobile ? '24px 14px 0' : '48px 48px 0', display: 'flex', flexDirection: 'column', gap: 44 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
          <span className="eyebrow">Estimated palette · {pal.name}</span>
          <h1 className="serif" style={{ fontSize: isMobile ? 48 : 72, lineHeight: 1 }}>Your colors</h1>
          <p className="pretty" style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--muted-2)' }}>
            {pal.blurb} This is an estimate from one photo — light, camera processing and makeup all shift it. Treat these as starting points, never rules. Tap colors to shop them; pick two or three to find pieces that combine them.
          </p>
        </div>

        {groups.map(([title, note, fams, big]) => {
          const h = big ? (isMobile ? 150 : 230) : isMobile ? 96 : 130;
          const min = big ? (isMobile ? 140 : 200) : isMobile ? 120 : 170;
          return (
            <section key={title} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 14px' }}>
                <h2 className="serif" style={{ fontSize: 28 }}>{title}</h2>
                <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{note}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))`, gap: 10 }}>
                {fams.map((f) => {
                  const on = sel.includes(f);
                  const hex = hexOf(f);
                  return (
                    <div key={f} role="button" tabIndex={0} aria-pressed={on} aria-label={`${fname(f)} ${hex}, ${on ? 'selected' : 'select to shop'}`}
                      onClick={() => toggle(f)}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(f); } }}
                      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', borderRadius: 'var(--radius-panel)', overflow: 'hidden', outline: `2px solid ${on ? 'var(--ink)' : 'transparent'}`, outlineOffset: 3, background: 'var(--panel)' }}>
                      <div style={{ position: 'relative', height: h, background: hex }}>
                        {on && <span style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 999, background: 'var(--bg)', color: 'var(--ink)', display: 'grid', placeItems: 'center' }}><CheckIcon size={14} /></span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 8px 10px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{fname(f)}</span>
                          <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{hex}</span>
                        </div>
                        <button className="btn-outline" onClick={(e) => { e.stopPropagation(); copy(hex); }} aria-label={`Copy ${hex}`}
                          style={{ height: 34, padding: '0 10px', background: 'var(--bg)', gap: 5, fontSize: 12 }}>
                          <CopyIcon />{copied === hex ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 14px' }}>
            <h2 className="serif" style={{ fontSize: 28 }}>Combinations to try</h2>
            <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>Three-color outfits built from your palette.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {pal.combos.map((c, i) => (
              <div key={c.join()} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--panel)', borderRadius: 'var(--radius-panel)', padding: '12px 12px 16px' }}>
                <div style={{ display: 'flex', height: 170, borderRadius: 'var(--radius-tile)', overflow: 'hidden' }}>
                  {c.map((f, j) => <div key={f} style={{ flex: [5, 3, 2][j], background: hexOf(f) }} />)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 4px' }}>
                  <span className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>{c.map(fname).join(' + ')}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted-2)' }}>{COMBO_NOTES[i]}</span>
                </div>
                <button className="btn-ink-outline" onClick={() => onApply(c)} style={{ alignSelf: 'flex-start', marginLeft: 4, height: 38, padding: '0 16px', fontSize: 13 }}>Shop this combination</button>
              </div>
            ))}
          </div>
        </section>
        <p className="serif" style={{ margin: '0 0 90px', fontStyle: 'italic', fontSize: 22, color: 'var(--muted-2)' }}>Guidance, not rules. Wear what you love.</p>
      </div>

      {sel.length > 0 && (
        <div style={{ position: 'sticky', bottom: 16, zIndex: 4, display: 'flex', justifyContent: 'center', padding: '0 12px', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999, padding: '8px 8px 8px 12px', boxShadow: '0 16px 40px rgba(31,29,26,.25)', animation: 'hueSheet .25s ease both' }}>
            <div style={{ display: 'flex' }}>
              {sel.map((f) => <span key={f} style={{ width: 26, height: 26, borderRadius: 999, background: hexOf(f), boxShadow: '0 0 0 2px var(--ink)', marginRight: -6 }} />)}
            </div>
            <span style={{ fontSize: 14, marginLeft: 6 }}>{sel.map(fname).join(' + ')}</span>
            <button className="btn-reset" onClick={() => setSel([])} style={{ color: 'var(--divider)', fontSize: 13, padding: 6 }}>Clear</button>
            <button className="btn-reset" onClick={() => onApply(sel)} style={{ height: 40, padding: '0 18px', borderRadius: 999, background: 'var(--bg)', color: 'var(--ink)', fontSize: 13.5, fontWeight: 500 }}>
              Show {selCount} piece{selCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
