import { useRef, useState } from 'react';
import { useDialogFocus } from '../hooks';
import { CloseIcon, Dots, LockIcon } from './Icons';

export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface Props {
  sheet: boolean;
  photo: string | null;
  photoName: string;
  photoSmall: boolean;
  error: string | null;
  onFile: (f: File) => void;
  onRemove: () => void;
  onContinue: () => void;
  onClose: () => void;
}

const TIPS = ['Natural lighting', 'Face clearly visible', 'No heavy filters'];

export function UploadModal(p: Props) {
  const ref = useDialogFocus<HTMLDivElement>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const pick = () => fileRef.current?.click();

  const style: React.CSSProperties = p.sheet
    ? { maxHeight: '94%', padding: '26px 18px 20px' }
    : { width: 'min(560px, calc(100% - 32px))', padding: '32px 32px 24px' };

  return (
    <div className="overlay" style={{ zIndex: 70 }}>
      <div className="scrim" onClick={p.onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="hue-up-title" className={p.sheet ? 'sheet' : 'modal'}
        style={{ ...style, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <button className="icon-btn" onClick={p.onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12 }}><CloseIcon /></button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 36 }}>
          <h2 id="hue-up-title" className="serif" style={{ fontSize: 38, lineHeight: 1.02 }}>Let's find your colors.</h2>
          <p className="pretty" style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--muted-2)' }}>
            A photo helps us tune your feed toward colors and pieces that may complement you. It takes a few seconds, and you can change everything afterwards.
          </p>
        </div>

        <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) p.onFile(f); }} />

        {!p.photo ? (
          <div
            onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) p.onFile(f); }}
            style={{
              border: `1.5px dashed ${dragging ? 'var(--ink)' : 'var(--divider)'}`, background: dragging ? 'var(--panel)' : 'transparent',
              borderRadius: 'var(--radius-panel)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', transition: 'background .15s ease',
            }}>
            <Dots colors={['#d67a61', '#9aa488', '#9db4cf']} size={26} overlap={9} />
            <div style={{ fontSize: 15 }}>Drag a photo here</div>
            <button className="btn-ink-outline" onClick={pick} style={{ height: 44, padding: '0 20px', background: 'var(--bg)', fontSize: 14, fontWeight: 500 }}>Upload a photo</button>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>JPG, PNG or WebP · up to 15 MB</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--panel)', borderRadius: 'var(--radius-panel)', padding: 12 }}>
            <img src={p.photo} alt="Your selected photo" style={{ width: 96, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-tile)', flex: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.photoName}</span>
              <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.4 }}>
                {p.photoSmall ? 'This photo is quite small, so the estimate may be less reliable.' : 'Looks good. Only this browser tab can see it.'}
              </span>
              <div style={{ display: 'flex', gap: 14 }}>
                <button className="link-btn" onClick={pick} style={{ padding: '4px 0', fontSize: 13 }}>Choose another</button>
                <button className="link-btn" onClick={p.onRemove} style={{ padding: '4px 0', fontSize: 13, color: 'var(--muted)' }}>Remove</button>
              </div>
            </div>
          </div>
        )}

        {p.error && (
          <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.45, color: 'var(--error)' }}>
            <span aria-hidden style={{ flex: 'none', width: 18, height: 18, borderRadius: 999, border: '1.5px solid currentColor', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, marginTop: 1 }}>!</span>
            <span>{p.error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
          {TIPS.map((label, i) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--line-strong)', paddingTop: 10 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 13, lineHeight: 1.3 }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.45, color: 'var(--text-2)' }}>
          <LockIcon style={{ flex: 'none', marginTop: 1 }} />
          <span>Your photo stays on your device. We process it in your browser and never upload it.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button className="btn-reset" onClick={p.onClose} style={{ padding: '10px 0', fontSize: 14, color: 'var(--muted-2)' }}>Maybe later</button>
          <button className="btn-dark" onClick={p.onContinue} disabled={!p.photo} style={{ height: 46, padding: '0 24px', fontSize: 14.5, fontWeight: 500, cursor: p.photo ? 'pointer' : 'not-allowed' }}>Continue</button>
        </div>
      </div>
    </div>
  );
}
