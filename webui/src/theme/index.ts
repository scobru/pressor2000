// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import { createTheme } from '@mui/material/styles';
import '@fontsource/red-hat-mono/400.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/600.css';
import '@fontsource/jost/700.css';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d2ff', // Electric Neon Cyan matching Spectra Denoiser
      light: '#67e8f9',
      dark: '#0284c7',
    },
    secondary: {
      main: '#ff9f1c', // Warm Amber accent matching Spectra Denoiser reduction slider
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#090c12', // Deep dark backdrop matching Spectra Denoiser gradient
      paper: '#12151f',   // Card panel background matching Spectra Denoiser controlsArea
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: '#222938',
  },
  typography: {
    fontFamily: '"Jost", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h6: {
      fontSize: '1.1rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
    body2: {
      fontSize: '0.82rem',
    },
    caption: {
      fontSize: '0.72rem',
      letterSpacing: '0.3px',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6,
          transition: 'all 0.15s ease-in-out',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#12151f',
          border: '1px solid #222938',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
          '& .MuiSlider-thumb': {
            width: 16,
            height: 16,
            backgroundColor: '#f8fafc',
            border: '2px solid #00d2ff',
            boxShadow: '0 0 10px rgba(0, 210, 255, 0.5)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 14px rgba(0, 210, 255, 0.8)',
            },
          },
          '& .MuiSlider-track': {
            backgroundColor: '#00d2ff',
            border: 'none',
          },
          '& .MuiSlider-rail': {
            backgroundColor: '#1e2430',
            opacity: 1,
          },
        },
      },
    },
  },
});