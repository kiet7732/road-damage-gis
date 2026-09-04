import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { UI_COLORS } from '../constants/statusColors';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({
      id: Date.now(),
      message,
      tone,
    });

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, 2600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...styles.toast,
            ...(toast.tone === 'error' ? styles.error : styles.success),
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}

const styles = {
  toast: {
    position: 'fixed',
    right: 24,
    bottom: 24,
    zIndex: 9999,
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    maxWidth: 360,
    padding: '0 18px',
    borderRadius: 14,
    color: UI_COLORS.surface,
    fontSize: 14,
    fontWeight: 900,
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.22)',
  },
  success: {
    background: '#119C39',
  },
  error: {
    background: UI_COLORS.danger,
  },
};
