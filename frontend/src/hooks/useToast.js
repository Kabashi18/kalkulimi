import { useState, useRef, useCallback, useEffect } from 'react';

// Njoftimi i përkohshëm (toast): zhduket vetë pas 3 s, gabimet pas 5 s.
// `showToast` është i qëndrueshëm (useCallback), ndaj mund t'u kalohet përbërësve me React.memo.
export function useToast() {
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  const timer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [toast, showToast];
}
