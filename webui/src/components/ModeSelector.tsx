// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useJuceComboBoxIndex } from '../hooks/useJuceParam';

interface ModeSelectorProps {
  parameterId: string;
  label: string;
  labelWidth?: number;
  options?: string[];
  descriptions?: string[];
}

const DEFAULT_OPTIONS = ['VCA', 'Opto', 'FET', 'Vari-Mu'];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  parameterId,
  label,
  labelWidth = 52,
  options = DEFAULT_OPTIONS,
  descriptions,
}) => {
  const { index, setIndex } = useJuceComboBoxIndex(parameterId);
  const safeIdx = Math.max(0, Math.min(options.length - 1, index));

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${labelWidth}px 1fr`,
        alignItems: 'center',
        columnGap: 0.5,
        width: '100%',
        py: 0,
      }}
    >
      <Typography
        variant='caption'
        sx={{ fontWeight: 700, fontSize: '0.70rem', color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', lineHeight: 1 }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          border: '1px solid #222938',
          borderRadius: '6px',
          overflow: 'hidden',
          height: 24,
          backgroundColor: '#0b0e14',
        }}
      >
        {options.map((opt, i) => {
          const active = i === safeIdx;
          const btn = (
            <Box
              key={opt}
              onClick={() => setIndex(i)}
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: active ? '#00d2ff' : 'transparent',
                color: active ? '#090c12' : '#94a3b8',
                boxShadow: active ? '0 0 10px rgba(0, 210, 255, 0.45)' : 'none',
                borderRight: i < options.length - 1 ? '1px solid #222938' : 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: active ? '#00d2ff' : '#161c28',
                  color: active ? '#090c12' : '#f8fafc',
                },
              }}
            >
              {opt}
            </Box>
          );
          return descriptions && descriptions[i] ? (
            <Tooltip key={opt} title={descriptions[i]} arrow placement='top'>
              {btn}
            </Tooltip>
          ) : (
            btn
          );
        })}
      </Box>
    </Box>
  );
};
