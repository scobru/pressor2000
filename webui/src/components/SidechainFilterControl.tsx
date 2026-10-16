// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import React from 'react';
import { Box, MenuItem, Select } from '@mui/material';
import { HorizontalParameter } from './HorizontalParameter';
import { useJuceComboBoxIndex, useJuceSliderValue } from '../hooks/useJuceParam';

const SLOPE_VALUES_DB = [6, 12, 18, 24] as const;

export const SC_HPF_OFF_HZ = 10;
export const SC_LPF_OFF_HZ = 24000;

const SLOPE_SELECT_HEIGHT = 22;

interface Props {
  kind: 'hpf' | 'lpf';
  freqParamId: string;
  slopeParamId: string;
  otherHz: number;
}

const formatHzWithOff = (v: number, isOff: boolean): string => {
  if (isOff) return 'OFF';
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? r.toString() : r.toFixed(1);
};

export const SidechainFilterControl: React.FC<Props> = ({ kind, freqParamId, slopeParamId, otherHz }) => {
  const isHpf = kind === 'hpf';
  const { value: freq } = useJuceSliderValue(freqParamId);
  const { index: slopeIdx, setIndex: setSlopeIdx } = useJuceComboBoxIndex(slopeParamId);

  const isOff = isHpf ? freq <= SC_HPF_OFF_HZ : freq >= SC_LPF_OFF_HZ;

  const clampValue = isHpf
    ? (v: number) => Math.min(v, otherHz)
    : (v: number) => Math.max(v, otherHz);

  const slopeSelect = (
    <Select
      value={slopeIdx}
      onChange={(e) => setSlopeIdx(Number(e.target.value))}
      size='small'
      variant='outlined'
      disabled={isOff}
      MenuProps={{
        slotProps: {
          paper: {
            sx: {
              backgroundColor: '#0e121a',
              border: '1px solid #222938',
              '& .MuiMenuItem-root': { fontSize: 12, minHeight: 24, py: 0.3, color: '#f8fafc' },
              '& .MuiMenuItem-root.Mui-selected': { backgroundColor: 'rgba(0, 210, 255, 0.2)', color: '#00d2ff' },
            },
          },
        },
      }}
      sx={{
        width: 28,
        height: SLOPE_SELECT_HEIGHT,
        ml: -0.5,
        fontSize: 11,
        color: '#f8fafc',
        backgroundColor: '#0b0e14',
        opacity: isOff ? 0.4 : 1,
        '& .MuiSelect-select': {
          padding: '0 9px 0 1px !important',
          textAlign: 'center',
          lineHeight: `${SLOPE_SELECT_HEIGHT - 2}px`,
        },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#222938' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00d2ff' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d2ff' },
        '& .MuiSelect-icon': { color: '#94a3b8', right: -3, fontSize: 14 },
      }}
    >
      {SLOPE_VALUES_DB.map((db, i) => (
        <MenuItem key={db} value={i}>{db}</MenuItem>
      ))}
    </Select>
  );

  return (
    <Box sx={{ opacity: isOff ? 0.7 : 1, mb: -2.5 }}>
      <HorizontalParameter
        parameterId={freqParamId}
        label={isHpf ? 'SC HPF' : 'SC LPF'}
        min={10}
        max={24000}
        skew='log'
        defaultValue={isHpf ? SC_HPF_OFF_HZ : SC_LPF_OFF_HZ}
        formatValue={(v) => formatHzWithOff(v, isHpf ? v <= SC_HPF_OFF_HZ : v >= SC_LPF_OFF_HZ)}
        unit={isOff ? undefined : 'Hz'}
        labelWidth={52}
        inputWidth={46}
        clampValue={clampValue}
        endAdornment={slopeSelect}
        maxInputDecimals={1}
        trackInverted={isHpf}
        taperFill
        marks={
          isHpf
            ? [
                { value: 10, label: 'OFF' },
                { value: 100, label: '100' },
                { value: 1000, label: '1k' },
              ]
            : [
                { value: 10, label: '10' },
                { value: 1000, label: '1k' },
                { value: 24000, label: 'OFF' },
              ]
        }
      />
    </Box>
  );
};
