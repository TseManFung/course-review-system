import { createTheme } from '@mui/material';
import type { PaletteMode, Theme } from '@mui/material';

export const createAppTheme = (mode: PaletteMode = 'light'): Theme =>
  createTheme({
    cssVariables: true,
    colorSchemes: { light: true, dark: true } as any,
    palette: {
      mode,
      primary: {
        main: '#1976d2', // blue
      },
      secondary: {
        main: '#1565c0',
      },
    },
    shape: { borderRadius: 8 },
  });
