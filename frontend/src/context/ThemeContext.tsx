import { createContext, useCallback, useContext, useMemo, useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import { buildTheme } from '../theme';

interface ThemeCtx {
  // current selected mode: 'light' | 'dark' | 'system'
  mode: string;
  // resolved concrete mode (if system -> light/dark based on media query)
  resolvedMode: PaletteMode;
  toggle: () => void;
  setMode: (m: PaletteMode | 'system') => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export const useThemeMode = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
};

const STORAGE_KEY = 'theme-mode'; // 'light' | 'dark' | 'system'

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const readInitial = (): string => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | 'system' | null;
    return saved || 'system';
  };

  const [mode, setMode] = useState<string>(readInitial);
  const resolvedMode: PaletteMode = (mode === 'system'
    ? (prefersDark?.matches ? 'dark' : 'light')
    : (mode as PaletteMode)) || 'light';

  // persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // listen system change when in system mode
  useEffect(() => {
    if (!prefersDark) return;
    const listener = () => {
      if (mode === 'system') {
        // force re-evaluate by updating state (same value OK)
        setMode(prev => prev);
      }
    };
    prefersDark.addEventListener('change', listener);
    return () => prefersDark.removeEventListener('change', listener);
  }, [mode, prefersDark]);

  const toggle = useCallback(() => {
    setMode(curr => (curr === 'system' ? 'light' : curr === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  const value = useMemo<ThemeCtx>(() => ({ mode, resolvedMode, toggle, setMode: setMode as any }), [mode, resolvedMode, toggle]);

  return (
    <Ctx.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </Ctx.Provider>
  );
};
