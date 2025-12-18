import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
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
          },
          '*::-webkit-scrollbar': {
            width: 10
          },
            '*::-webkit-scrollbar-track': {
            background: theme.palette.background.default
          },
          '*::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' ? '#444' : '#ccc',
            borderRadius: 8
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

const defaultTheme = buildTheme('light');
export default defaultTheme;
