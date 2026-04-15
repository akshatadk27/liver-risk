// src/hooks/useScrollToTop.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the window to (0, 0) on every route change.
 * Used inside <ScrollToTop /> which is rendered inside <BrowserRouter>.
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
}
