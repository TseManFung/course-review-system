import { extendTheme } from '@mui/material/styles';

// Central theme using MUI v7 experimental CSS variables + colorSchemes API
// Light / Dark palettes can be tuned further if needed.
export const appTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#1565c0' },
        background: {
          default: '#fafafa',
          paper: '#ffffff'
        }
      }
    },
    dark: {
      palette: {
        primary: { main: '#90caf9' },
        secondary: { main: '#64b5f6' },
        background: {
          default: '#121212',
          paper: '#1e1e1e'
        }
      }
    }
  },
  shape: { borderRadius: 8 },
  // Example of component style overrides if needed
  components: {
    MuiAppBar: {
      styleOverrides: {
  root: ({ theme }: { theme: any }) => ({
          backgroundImage: 'none',
          boxShadow: theme.palette.mode === 'dark' ? '0 0 0 1px rgba(255,255,255,0.08)' : undefined
        })
      }
    }
  }
});

export default appTheme;
