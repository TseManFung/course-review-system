import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

// 單純使用 createTheme，不用 extendTheme / colorSchemes。改由外層以 state 切換兩個 theme。
export const buildTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#1976d2' },
            secondary: { main: '#1565c0' },
            background: { default: '#fafafa', paper: '#ffffff' }
          }
        : {
            primary: { main: '#90caf9' },
            secondary: { main: '#64b5f6' },
            background: { default: '#121212', paper: '#1e1e1e' }
          })
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme: any) => ({
          'html, body, #root': {
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            minHeight: '100%',
            transition: 'background-color .25s ease, color .25s ease'
          },
          body: {
            margin: 0,
            WebkitFontSmoothing: 'antialiased'
          }
        })
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease'
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600
          }
        }
      }
    }
  });

// 預設匯出 light 版本，方便目前引用不改太多
const defaultTheme = buildTheme('light');
export default defaultTheme;
