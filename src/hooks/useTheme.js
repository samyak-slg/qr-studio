import { useCallback, useEffect, useState } from 'react';

export const THEME_KEY = 'qr-studio:theme';

function initialTheme() {
  // index.html already picked a theme before React loaded; reuse it so nothing flickers.
  const fromPage = document.documentElement.dataset.theme;
  if (fromPage === 'light' || fromPage === 'dark') return fromPage;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage blocked: the theme still works for this visit.
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), []);
  return [theme, toggle];
}
