import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PREFS, NAV_LABEL, PALETTES, STATUS, STYLES, type Cat, type PaletteKey, type Prefs } from '../data';
import { analyzePhoto, fname, hexOf, placeholderBg, tone, type Analysis } from '../lib';
import { useDialogFocus } from '../hooks';
import { CheckIcon, CloseIcon, LockIcon } from './Icons';

interface Props {
  mode: 'analysis' | 'prefs';
  isMobile: boolean;
  padX: number;
  photo: string | null;
  paletteKey: PaletteKey;
  prefs: Prefs;
  /** Called with the analysis result (analysis mode only) and the chosen prefs. */
  onDone: (prefs: Prefs, result: Analysis | null) => void;
  onClose: () => void;
  onNewPhoto: () => void;
}

const MSG_MS = 1500, READY_MS = 6300;
const FALLBACK: Analysis = { key: 'warmDeep', hex: null };

export function Studio(p: Props) {
  const ref = useDialogFocus<HTMLDivElement>();
  const analysis = p.mode === 'analysis';
  const [draft, setDraft] = useState<Prefs>(p.prefs);
  const [msg, setMsg] = useState(0);
  const [ready, setReady] = useState(!analysis);
  const [result, setResult] = useState<Analysis | null>(null);
  const [skipQueued, setSkipQueued] = useState(false);
  const resultRef = useRef<Analysis | null>(null);

  useEffect(() => {
    if (!analysis) return;
    let alive = true;
    analyzePhoto(p.photo).then((r) => { if (alive) { resultRef.current = r || FALLBACK; setResult(resultRef.current); } });
    const iv = setInterval(() => setMsg((m) => Math.min(m + 1, STATUS.length - 1)), MSG_MS);
    const done = setTimeout(() => {
      clearInterval(iv);
      if (!resultRef.current) { resultRef.current = FALLBACK; setResult(FALLBACK); }
      setReady(true);
    }, READY_MS);
    return () => { alive = false; clearInterval(iv); clearTimeout(done); };
  }, [analysis, p.photo]);

  const finish = (prefs: Prefs) => p.onDone(prefs, analysis ? resultRef.current || FALLBACK : null);
  useEffect(() => { if (ready && skipQueued) finish({ ...DEFAULT_PREFS }); }, [ready, skipQueued]);

  const pendingPal = PALETTES[(analysis ? result?.key : p.paletteKey) || 'warmDeep'];
  const dots = [...pendingPal.rec, ...pendingPal.neu, ...pendingPal.acc];
  const photoMax = p.isMobile ? '100%' : '440px';

  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const togList = (k: 'styles' | 'cats', v: string) =>
    setDraft((d) => {
      const a = d[k] as string[];
      return { ...d, [k]: a.includes(v) ? a.filter((x) => x !== v) : [...a, v] };
    });

  const chips = (opts: string[], isOn: (o: string) => boolean, set: (o: string) => void, label?: (o: string) => string, pad = 16) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {opts.map((o) => (
        <button key={o} className="chip" aria-pressed={isOn(o)} onClick={() => set(o)} style={{ minHeight: 42, padding: `0 ${pad}px`, fontSize: 13.5 }}>{label ? label(o) : o}</button>
      ))}
    </div>
  );

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Personalize your feed" className="fullscreen" style={{ zIndex: 80, animation: 'hueFade .3s ease both' }}>
      <div className="topbar" style={{ padding: `0 ${p.padX}px` }}>
        <span className="serif" style={{ fontSize: 30 }}>Hue</span>
        <button className="btn-outline" onClick={p.onClose} style={{ height: 40, padding: '0 14px', fontSize: 13 }}><CloseIcon size={14} sw={1.8} />Back to feed</button>
      </div>
      <div style={{
        maxWidth: 1240, margin: '0 auto', padding: p.isMobile ? '20px 14px 0' : '40px 48px 0', display: 'grid',
        gridTemplateColumns: p.isMobile ? 'minmax(0,1fr)' : 'minmax(0,5fr) minmax(0,7fr)', gap: p.isMobile ? 28 : 64, alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: p.isMobile ? 'static' : 'sticky', top: 86 }}>
          {analysis ? (
            <>
              <div style={{ position: 'relative', aspectRatio: '4 / 5', width: '100%', maxWidth: photoMax, borderRadius: 'var(--radius-panel)', overflow: 'hidden', ...placeholderBg({ bg: '#d9d2c6', fg: '', stripe: 'rgba(0,0,0,.05)' }) }}>
                {p.photo
                  ? <img src={p.photo} alt="Your uploaded photo" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span className="mono" style={{ position: 'absolute', left: 14, bottom: 14, fontSize: 11, color: 'var(--muted-2)' }}>your photo</span>}
                {!ready && (
                  <div aria-hidden style={{
                    position: 'absolute', left: 0, right: 0, top: 0, height: '24%', mixBlendMode: 'multiply',
                    background: 'linear-gradient(180deg, rgba(214,122,97,0), rgba(214,122,97,.32) 30%, rgba(198,150,47,.3) 45%, rgba(154,164,136,.3) 60%, rgba(157,180,207,.32) 75%, rgba(157,180,207,0))',
                    animation: 'hueScan 2.6s cubic-bezier(.45,0,.55,1) infinite alternate',
                  }} />
                )}
                <span style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', borderRadius: 999, padding: '5px 10px 5px 8px', fontSize: 11.5 }}>
                  <LockIcon size={12} sw={2} />On this device
                </span>
              </div>
              <div aria-live="polite" style={{ minHeight: 52, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: photoMax }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, flex: 'none', background: ready ? '#68663A' : '#A24E2B', animation: ready ? 'none' : 'huePulse 1.2s ease-in-out infinite' }} />
                  <span key={ready ? 'r' : msg} style={{ animation: 'hueFade .45s ease both' }}>{ready ? 'Your palette is ready.' : STATUS[msg]}</span>
                </div>
                <span className="pretty" style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
                  We're reading the light and undertone in your photo to estimate a starting palette, then matching it against pieces in the feed.
                </span>
              </div>
              {ready && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: photoMax, borderTop: '1px solid var(--line)', paddingTop: 16, animation: 'hueFade .4s ease both' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <span className="serif" style={{ fontSize: 26 }}>{pendingPal.name}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>ESTIMATE</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {dots.map((f) => <span key={f} title={fname(f)} style={{ flex: 1, height: 36, borderRadius: 2, background: hexOf(f), boxShadow: 'inset 0 0 0 1px rgba(31,29,26,.08)' }} />)}
                  </div>
                  <span className="pretty" style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.5 }}>{pendingPal.blurb}</span>
                  {result?.hex && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5, color: 'var(--muted-2)' }}>
                      <span style={{ width: 22, height: 22, borderRadius: 2, background: result.hex, flex: 'none' }} />
                      <span>Sampled tone <span className="mono">{result.hex}</span> — lighting, camera processing and makeup all shift this.</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="eyebrow">Your palette</span>
              <span className="serif" style={{ fontSize: 34, lineHeight: 1 }}>{pendingPal.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {dots.map((f) => <span key={f} title={fname(f)} style={{ flex: 1, height: 64, borderRadius: 2, background: hexOf(f) }} />)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.5 }}>Your original photo was discarded after analysis. To re-estimate, add a new one.</span>
              <button className="btn-ink-outline" onClick={p.onNewPhoto} style={{ alignSelf: 'flex-start', height: 40, padding: '0 16px', fontSize: 13 }}>Use a new photo</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="eyebrow">{analysis ? 'Optional · while we work' : 'Edit preferences'}</span>
            <h2 className="serif pretty" style={{ fontSize: p.isMobile ? 32 : 44, lineHeight: 1.02 }}>
              {analysis ? 'Tell us a little about your taste.' : 'Refine what shows up in your edit.'}
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--muted-2)', lineHeight: 1.5, maxWidth: 560 }}>Pick as many or as few as you like — nothing here is required.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Style</span>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${p.isMobile ? 3 : 6},minmax(0,1fr))`, gap: 10 }}>
              {STYLES.map(([label, hex, shot]) => {
                const on = draft.styles.includes(label);
                const t = tone(hex);
                return (
                  <button key={label} className="btn-reset" aria-pressed={on} onClick={() => togList('styles', label)} style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', borderRadius: 'var(--radius-tile)', ...placeholderBg(t), outline: `2px solid ${on ? 'var(--ink)' : 'transparent'}`, outlineOffset: 2 }}>
                      <span className="mono" style={{ position: 'absolute', left: 8, bottom: 8, right: 8, fontSize: 9.5, color: t.fg, opacity: 0.75 }}>{shot}</span>
                      {on && (
                        <span style={{ position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center' }}><CheckIcon /></span>
                      )}
                    </div>
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Shopping budget</span>
            {chips(['Affordable', 'Mid-range', 'Premium', 'No preference'], (o) => draft.budget === o, (o) => setPref('budget', o))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Categories <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· any you shop for</span></span>
            {chips(['Tops', 'Trousers', 'Dresses', 'Jackets', 'Shoes', 'Accessories'], (o) => draft.cats.includes(o as Cat), (o) => togList('cats', o), (o) => NAV_LABEL[o as Cat] || o)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Preferred fit</span>
              {chips(['Relaxed', 'Regular', 'Tailored', 'No preference'], (o) => draft.fit === o, (o) => setPref('fit', o), undefined, 14)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Show me</span>
              {chips(['Individual pieces', 'Complete outfits', 'Both'], (o) => draft.shop === o, (o) => setPref('shop', o), undefined, 14)}
            </div>
          </div>

          <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: '14px 0 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="link-btn" onClick={() => (ready ? finish({ ...DEFAULT_PREFS }) : setSkipQueued(true))} style={{ padding: '10px 0', fontSize: 14 }}>Skip — use all styles</button>
            <button className="btn-dark" onClick={() => ready && finish(draft)} disabled={!ready} style={{ height: 48, padding: '0 26px', fontSize: 15, fontWeight: 500, cursor: ready ? 'pointer' : 'progress' }}>
              {!analysis ? 'Update my edit' : ready ? 'Show my edit' : skipQueued ? 'Finishing your palette…' : 'Preparing your palette…'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
