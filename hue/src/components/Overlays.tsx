import { useDialogFocus } from '../hooks';

export function ResetDialog({ sheet, onCancel, onConfirm }: { sheet: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>();
  return (
    <div className="overlay" style={{ zIndex: 90 }}>
      <div className="scrim" onClick={onCancel} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="hue-reset-title" className={sheet ? 'sheet' : 'modal'}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, ...(sheet ? { maxHeight: '94%', padding: '26px 18px 20px' } : { width: 'min(440px, calc(100% - 32px))', padding: '32px 32px 24px' }) }}>
        <h2 id="hue-reset-title" className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>Reset personalization?</h2>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted-2)' }}>
          This clears your palette estimate and preferences from this device and returns you to the general feed. Your saved pieces stay.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={onCancel} style={{ height: 44, padding: '0 18px', fontSize: 14 }}>Keep my edit</button>
          <button className="btn-dark" onClick={onConfirm} style={{ height: 44, padding: '0 18px', fontSize: 14 }}>Reset</button>
        </div>
      </div>
    </div>
  );
}

export interface ToastData { msg: string; label?: string; action?: () => void }

export function Toast({ toast }: { toast: ToastData }) {
  // Outer wrapper centers; the inner pill animates (its transform would otherwise fight the centering).
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 22, zIndex: 100, display: 'flex', justifyContent: 'center', padding: '0 12px', pointerEvents: 'none' }}>
      <div role="status" style={{
        pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 14, maxWidth: '100%',
        background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999, padding: toast.action ? '10px 10px 10px 18px' : '10px 18px', fontSize: 13.5,
        boxShadow: '0 12px 32px rgba(31,29,26,.25)', whiteSpace: 'nowrap', animation: 'hueFade .2s ease both',
      }}>
        <span>{toast.msg}</span>
        {toast.action && (
          <button className="btn-reset" onClick={toast.action} style={{ height: 32, padding: '0 12px', borderRadius: 999, background: 'var(--ink-hover)', color: 'var(--bg)', fontSize: 12.5 }}>{toast.label}</button>
        )}
      </div>
    </div>
  );
}
