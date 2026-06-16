import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'error' | 'success' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, update: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

// Safety fallback: auto-dismiss loading toasts after 30s to prevent stuck messages
const LOADING_TOAST_TIMEOUT = 30_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    }

    // Safety fallback: persistent loading toasts auto-dismiss after timeout
    if (toast.type === 'loading' && (!toast.duration || toast.duration === 0)) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, LOADING_TOAST_TIMEOUT);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, update: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...update } : t)),
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const icons = {
    error: <AlertCircle size={16} className="text-destructive shrink-0" />,
    success: <CheckCircle size={16} className="text-success shrink-0" />,
    info: <Info size={16} className="text-primary shrink-0" />,
    loading: <Loader2 size={16} className="text-primary shrink-0 animate-spin" />,
  };

  const borderColors = {
    error: 'border-destructive/40',
    success: 'border-success/40',
    info: 'border-primary/40',
    loading: 'border-primary/40',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border-2 bg-card-solid/95 backdrop-blur-xl px-4 py-3 shadow-lg transition-all duration-300',
        borderColors[toast.type],
        isExiting ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100 animate-fade-in-up',
      )}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
