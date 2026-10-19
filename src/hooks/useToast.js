// ─── Toast hook ───────────────────────────────────────────────────────────
import { useApp } from '../app/AppContext';
import { useCallback } from 'react';

export function useToast() {
  const { dispatch } = useApp();

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, kind: type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
  }, [dispatch]);

  return {
    success: (msg) => toast(msg, 'success'),
    error:   (msg) => toast(msg, 'error'),
    info:    (msg) => toast(msg, 'info'),
    warn:    (msg) => toast(msg, 'warn'),
  };
}
