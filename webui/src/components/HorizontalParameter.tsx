// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Box, Input, Slider, Typography } from '@mui/material';
import { useJuceSliderValue } from '../hooks/useJuceParam';
import { useFineAdjustPointer } from '../hooks/useFineAdjustPointer';
import { useNumberInputAdjust } from '../hooks/useNumberInputAdjust';

type SkewKind = 'linear' | 'log';

interface HorizontalParameterProps {
  parameterId: string;
  label: string;
  min: number;
  max: number;
  skew?: SkewKind;
  defaultValue?: number;
  formatValue?: (v: number) => string;
  unit?: string;
  marks?: Array<{ value: number; label: string }>;
  labelWidth?: number;
  inputWidth?: number;
  wheelStep?: number;
  wheelStepFine?: number;
  clampValue?: (v: number) => number;
  endAdornment?: React.ReactNode;
  trackInverted?: boolean;
  maxInputDecimals?: number;
  taperFill?: boolean;
}

const valueToNorm = (v: number, min: number, max: number, skew: SkewKind): number => {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, v));
  if (skew === 'log' && min > 0) {
    return Math.log(clamped / min) / Math.log(max / min);
  }
  return (clamped - min) / (max - min);
};

const normToValue = (t: number, min: number, max: number, skew: SkewKind): number => {
  const clamped = Math.max(0, Math.min(1, t));
  if (skew === 'log' && min > 0) {
    return min * Math.pow(max / min, clamped);
  }
  return min + (max - min) * clamped;
};

export const HorizontalParameter: React.FC<HorizontalParameterProps> = ({
  parameterId,
  label,
  min,
  max,
  skew = 'linear',
  defaultValue,
  formatValue,
  unit,
  marks,
  labelWidth = 52,
  inputWidth = 50,
  wheelStep = 1,
  wheelStepFine = 0.2,
  clampValue,
  endAdornment,
  trackInverted = false,
  maxInputDecimals,
  taperFill = false,
}) => {
  const { value, state: sliderState, setScaled } = useJuceSliderValue(parameterId);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');

  const applyValue = (v: number) => setScaled(clampValue ? clampValue(v) : v, min, max);

  const formatted = formatValue ? formatValue(value) : value.toFixed(1);
  const displayInput = isEditing ? inputText : formatted;

  const stepValueLinear = (current: number, fine: boolean, direction: 1 | -1): number => {
    const s = fine ? wheelStepFine : wheelStep;
    return current + s * direction;
  };
  const stepValueLog = (current: number, fine: boolean, direction: 1 | -1): number => {
    const s = fine ? wheelStepFine : wheelStep;
    const normStep = s / 100;
    const cur = valueToNorm(current, min, max, 'log');
    return normToValue(cur + normStep * direction, min, max, 'log');
  };
  const stepValue = (current: number, fine: boolean, direction: 1 | -1): number =>
    skew === 'log' ? stepValueLog(current, fine, direction) : stepValueLinear(current, fine, direction);

  const stepFromCurrent = useEffectEvent((direction: 1 | -1, fine: boolean) => {
    applyValue(stepValue(value, fine, direction));
  });

  const wheelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const direction: 1 | -1 = -e.deltaY > 0 ? 1 : -1;
      const fine = e.shiftKey || e.ctrlKey || e.metaKey || e.altKey;
      stepFromCurrent(direction, fine);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as EventListener);
  }, []);

  const fineDragStartRef = useRef<{ value: number; norm: number }>({ value: 0, norm: 0 });
  const handlePointerDownCapture = useFineAdjustPointer({
    orientation: 'horizontal',
    onReset: () => {
      if (defaultValue !== undefined) applyValue(defaultValue);
    },
    onDragStart: () => {
      fineDragStartRef.current = {
        value: value,
        norm: valueToNorm(value, min, max, skew),
      };
      sliderState?.sliderDragStarted();
    },
    onDragDelta: (deltaPx) => {
      if (skew === 'log') {
        applyValue(normToValue(fineDragStartRef.current.norm + deltaPx * 0.002, min, max, 'log'));
      } else {
        applyValue(fineDragStartRef.current.value + deltaPx * wheelStepFine);
      }
    },
    onDragEnd: () => sliderState?.sliderDragEnded(),
  });

  const inputElRef = useRef<HTMLInputElement | null>(null);
  const inputDragStartRef = useRef<{ value: number; norm: number }>({ value: 0, norm: 0 });
  useNumberInputAdjust(inputElRef, {
    onWheelStep: (direction, fine) => {
      applyValue(stepValue(value, fine, direction));
    },
    onDragStart: () => {
      inputDragStartRef.current = {
        value: value,
        norm: valueToNorm(value, min, max, skew),
      };
      sliderState?.sliderDragStarted();
    },
    onDragDelta: (deltaY, fine) => {
      if (skew === 'log') {
        const normStep = fine ? 0.002 : 0.01;
        applyValue(normToValue(inputDragStartRef.current.norm + deltaY * normStep, min, max, 'log'));
      } else {
        const step = fine ? wheelStepFine : wheelStep;
        applyValue(inputDragStartRef.current.value + deltaY * step);
      }
    },
    onDragEnd: () => sliderState?.sliderDragEnded(),
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: endAdornment
          ? `${labelWidth}px 1fr ${inputWidth}px auto`
          : `${labelWidth}px 1fr ${inputWidth}px`,
        gridTemplateRows: 'auto 12px',
        alignItems: 'center',
        columnGap: 0.5,
        width: '100%',
      }}
    >
      <Typography
        variant='caption'
        sx={{
          gridRow: 1,
          fontWeight: 700,
          fontSize: '0.70rem',
          color: '#94a3b8',
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>

      <Box
        ref={wheelRef}
        onPointerDownCapture={handlePointerDownCapture}
        sx={{
          gridRow: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          px: '6px',
          py: 0,
        }}
      >
        {taperFill && (
          <Box sx={{ position: 'absolute', left: '6px', right: '6px', top: 0, bottom: 0, pointerEvents: 'none' }}>
            <Box
              sx={{
                position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
                height: 4, borderRadius: 2, bgcolor: '#0e121a', border: '1px solid #222938',
              }}
            />
            <Box
              sx={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                height: 4, borderRadius: 2, bgcolor: '#00d2ff', boxShadow: '0 0 8px rgba(0, 210, 255, 0.45)',
                ...(trackInverted
                  ? { left: `${valueToNorm(value, min, max, skew) * 100}%`, right: 0 }
                  : { left: 0, width: `${valueToNorm(value, min, max, skew) * 100}%` }),
              }}
            />
          </Box>
        )}
        <Slider
          value={valueToNorm(value, min, max, skew)}
          onChange={(_: Event, v: number | number[]) => {
            applyValue(normToValue(v as number, min, max, skew));
          }}
          onMouseDown={() => {
            if (!isDragging) {
              setIsDragging(true);
              sliderState?.sliderDragStarted();
            }
          }}
          onChangeCommitted={() => {
            if (isDragging) {
              setIsDragging(false);
              sliderState?.sliderDragEnded();
            }
          }}
          min={0}
          max={1}
          step={0.001}
          track={taperFill ? false : trackInverted ? 'inverted' : 'normal'}
          valueLabelDisplay='off'
          sx={{
            width: '100%',
            padding: 0,
            height: 14,
            '@media (pointer: coarse)': {
              padding: 0,
            },
            '& .MuiSlider-thumb': {
              width: 14,
              height: 14,
              backgroundColor: '#ffffff',
              border: '2px solid #00d2ff',
              boxShadow: '0 0 8px rgba(0, 210, 255, 0.6)',
              transition: 'all 80ms',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 12px rgba(0, 210, 255, 0.9)',
                transform: 'scale(1.15)',
              },
            },
            '& .MuiSlider-track': {
              height: 4,
              borderRadius: 2,
              border: 'none',
              background: 'linear-gradient(90deg, #0284c7 0%, #00d2ff 100%)',
              boxShadow: '0 0 8px rgba(0, 210, 255, 0.4)',
              display: taperFill ? 'none' : 'block',
            },
            '& .MuiSlider-rail': {
              height: 4,
              borderRadius: 2,
              backgroundColor: '#0e121a',
              border: '1px solid #222938',
              opacity: 1,
              display: taperFill ? 'none' : 'block',
            },
          }}
        />
      </Box>

      {marks && marks.length > 0 && (
        <Box
          sx={{
            gridRow: 2,
            gridColumn: 2,
            position: 'relative',
            height: '12px',
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '6px',
              right: '6px',
              top: 0,
              bottom: 0,
            }}
          >
            {marks.map((m) => {
              const pct = valueToNorm(m.value, min, max, skew) * 100;
              return (
                <Typography
                  key={m.value}
                  component='span'
                  sx={{
                    position: 'absolute',
                    left: `${pct}%`,
                    transform: 'translateX(-50%)',
                    top: 0,
                    fontSize: '0.62rem',
                    color: '#94a3b8',
                    fontFamily: '"Red Hat Mono", monospace',
                    lineHeight: 1,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.label}
                </Typography>
              );
            })}
          </Box>
        </Box>
      )}

      <Box sx={{ gridRow: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
        <Input
          className='block-host-shortcuts'
          inputRef={inputElRef}
          value={displayInput}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => {
            setIsEditing(true);
            setInputText(formatted);
          }}
          onBlur={() => {
            setIsEditing(false);
            const parsed = parseFloat(inputText);
            if (!isNaN(parsed)) {
              const v =
                maxInputDecimals != null
                  ? Math.round(parsed * 10 ** maxInputDecimals) / 10 ** maxInputDecimals
                  : parsed;
              applyValue(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          disableUnderline
          sx={{
            '& input': {
              padding: '2px 4px',
              fontSize: '11px',
              textAlign: 'right',
              width: 32,
              backgroundColor: '#0b0e14',
              border: '1px solid #222938',
              borderRadius: '4px',
              color: '#f8fafc',
              fontFamily: '"Red Hat Mono", monospace',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              '&:focus': {
                borderColor: '#00d2ff',
                boxShadow: '0 0 6px rgba(0, 210, 255, 0.4)',
                backgroundColor: '#0e121a',
                outline: 'none',
              },
            },
          }}
        />
        {unit && (
          <Typography
            variant='caption'
            sx={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, width: 14, textAlign: 'left', lineHeight: 1 }}
          >
            {unit}
          </Typography>
        )}
      </Box>

      {endAdornment && (
        <Box sx={{ gridRow: 1, gridColumn: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pl: 0.5 }}>
          {endAdornment}
        </Box>
      )}
    </Box>
  );
};
