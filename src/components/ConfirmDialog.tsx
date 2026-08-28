import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Brauzerning `confirm()` oynasi o'rniga — dizaynga mos tasdiqlash oynasi.
 * `confirm()` ba'zi brauzerlarda bloklanadi va sahifa uslubiga mos kelmaydi.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Escape tugmasi bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="glass-card p-6 w-full max-w-sm animate-scale-in bg-navy-950/95">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                destructive ? 'bg-error-500/10 text-error-400' : 'bg-electric-500/10 text-electric-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-white">
              {title}
            </h3>
          </div>
          <button onClick={onCancel} className="text-navy-400 hover:text-white" aria-label="Yopish">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-navy-300 mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="btn-secondary flex-1 text-sm disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
              destructive
                ? 'bg-error-500/15 border border-error-500/30 text-error-300 hover:bg-error-500/25'
                : 'bg-gradient-to-r from-electric-500 to-electric-600 text-white hover:shadow-lg hover:shadow-electric-500/30'
            }`}
          >
            {busy ? 'Bajarilmoqda...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
