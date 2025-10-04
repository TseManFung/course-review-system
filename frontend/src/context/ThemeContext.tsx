import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline } from '@mui/material';
import { CssVarsProvider } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import appTheme from '../theme';

interface ThemeCtx {
  mode: PaletteMode;
  toggle: () => void;
  setMode: (m: PaletteMode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export const useThemeMode = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
};

const STORAGE_KEY = 'theme-mode';

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We store user's explicit choice; if none, defer to system preference evaluated by CssVarsProvider
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PaletteMode | null;
    return saved || 'light';
  });

  const toggle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle]);

  return (
    <CssVarsProvider theme={appTheme} defaultMode={mode} modeStorageKey={STORAGE_KEY}>
      <Ctx.Provider value={value}>
        <CssBaseline />
        {children}
      </Ctx.Provider>
    </CssVarsProvider>
  );
};
