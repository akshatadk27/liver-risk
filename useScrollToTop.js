// src/hooks/useScrollToTop.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the window to (0, 0) on every route change.
 * Place this hook once inside a component that lives inside <BrowserRouter>
 * (e.g. a <ScrollToTop /> component rendered inside <Routes>).
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use 'instant' so there is no animation — the user expects a fresh page,
    // not a visible scroll jump. Falls back to window.scrollTo(0,0) in older
    // browsers that do not support the options object.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
}
