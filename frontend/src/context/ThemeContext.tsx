import { createContext, useCallback, useContext, useMemo, useEffect } from 'react';
import { CssBaseline } from '@mui/material';
import { CssVarsProvider, useColorScheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import appTheme from '../theme';

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

const STORAGE_KEY = 'theme-mode';

// Inner provider to access useColorScheme (must be inside CssVarsProvider)
const Inner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode, setMode, systemMode } = useColorScheme();

  // MUI 指南：初始 render 可能為 undefined，直接 return null 避免 hydration mismatch / 閃爍
  if (!mode) return null;

  const resolvedMode: PaletteMode = (mode === 'system' ? (systemMode as PaletteMode | undefined) : mode) as PaletteMode || 'light';

  const toggle = useCallback(() => {
    // 不在 system 時做單純 light/dark 切換；在 system 時先切到 light
    if (mode === 'system') setMode('light');
    else setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  // Fallback：若 CssVarsProvider 沒有自動加上屬性，手動同步 <html data-mui-color-scheme>
  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-mui-color-scheme');
    if (attr !== resolvedMode) {
      document.documentElement.setAttribute('data-mui-color-scheme', resolvedMode);
    }
  }, [resolvedMode]);

  const value = useMemo<ThemeCtx>(() => ({ mode, resolvedMode, toggle, setMode }), [mode, resolvedMode, toggle, setMode]);

  return (
    <Ctx.Provider value={value}>
      <CssBaseline />
      {children}
    </Ctx.Provider>
  );
};

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CssVarsProvider
    theme={appTheme}
    defaultMode="system"
    modeStorageKey={STORAGE_KEY}
    disableTransitionOnChange
  >
    <Inner>{children}</Inner>
  </CssVarsProvider>
);
