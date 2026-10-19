// ─── Toast Container ─────────────────────────────────────────────────────
import { useApp } from '../../app/AppContext';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={16} className="text-teal shrink-0" />,
  error:   <AlertCircle size={16} className="text-red-500 shrink-0" />,
  info:    <Info size={16} className="text-cobalt shrink-0" />,
  warn:    <AlertTriangle size={16} className="text-gold shrink-0" />,
};

const borders = {
  success: 'border-l-teal',
  error:   'border-l-red-400',
  info:    'border-l-cobalt',
  warn:    'border-l-gold',
};

function Toast({ id, message, kind = 'info' }) {
  const { dispatch } = useApp();
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        animate-toastIn flex items-start gap-3 px-4 py-3 rounded-lg
        bg-surface border border-border border-l-4 ${borders[kind] ?? borders.info}
        shadow-elevated min-w-64 max-w-80
      `}
    >
      {icons[kind]}
      <p className="text-sm text-ink flex-1 leading-snug">{message}</p>
      <button
        onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: id })}
        className="text-ink-muted hover:text-ink shrink-0 -mt-0.5 -mr-1"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { state } = useApp();
  if (!state.toasts.length) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Notifications"
    >
      {state.toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} />
        </div>
      ))}
    </div>
  );
}
