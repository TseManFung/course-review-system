import { extendTheme } from '@mui/material/styles';

// Use a cast to any to bypass strict typing issues with colorSchemes in current @mui/material version.
export const appTheme = extendTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#1565c0' },
        background: { default: '#fafafa', paper: '#ffffff' }
      }
    },
    dark: {
      palette: {
        primary: { main: '#90caf9' },
        secondary: { main: '#64b5f6' },
        background: { default: '#121212', paper: '#1e1e1e' }
      }
    }
  },
  shape: { borderRadius: 8 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }: { theme: any }) => [
          { backgroundImage: 'none' },
          theme.applyStyles('dark', { boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' })
        ]
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }: { theme: any }) => [
          { transition: 'background-color 0.15s ease' },
          theme.applyStyles('dark', {
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03), rgba(255,255,255,0.03))'
          })
        ]
      }
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }: { theme: any }) => [
          { textTransform: 'none', fontWeight: 600 },
          theme.applyStyles('dark', { boxShadow: 'none' })
        ]
      }
    }
  }
} as any);

export default appTheme;
