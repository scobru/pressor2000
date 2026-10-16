// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Box, Input, Slider, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useJuceSliderValue } from '../hooks/useJuceParam';
import { useFineAdjustPointer } from '../hooks/useFineAdjustPointer';
import { useNumberInputAdjust } from '../hooks/useNumberInputAdjust';

type SkewKind = 'linear' | 'log';

interface ParameterFaderProps {
  parameterId: string;
  min: number;
  max: number;
  /** レンジスキュー。'log' の場合は min..max の等比マッピング（1..100 など） */
  skew?: SkewKind;
  label: string;
  /** 目盛りに配置する実値（下→上） */
  scaleMarks?: Array<{ value: number; label: string }>;
  defaultValue?: number;
  wheelStep?: number;
  wheelStepFine?: number;
  color?: 'primary' | 'secondary';
  active?: boolean;
  sliderHeight?: number;
  /** 表示フォーマッタ（入力欄の桁合わせ用） */
  formatValue?: (v: number) => string;
  /** 数値入力欄のサフィックス（':1' など、UI 表示のみ） */
  suffix?: string;
  /** true で上下反転（最小値を上、最大値を下に配置）。Ratio フェーダー用。 */
  inverted?: boolean;
  /** true で半透明化 + 操作不可（Auto Makeup ON 時の Output Gain など）。 */
  disabled?: boolean;
}

const StyledSlider = styled(Slider)(() => {
  const trackGradient = 'linear-gradient(180deg, #67e8f9 0%, #00d2ff 60%, #0284c7 100%)';

  return {
    '& .MuiSlider-rail': {
      width: 8,
      borderRadius: 4,
      backgroundColor: '#0e121a',
      border: '1px solid #222938',
      opacity: 1,
      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.7)',
    },
    '& .MuiSlider-track': {
      width: 8,
      borderRadius: 3,
      border: 'none',
      background: trackGradient,
      boxShadow: '0 0 10px rgba(0, 210, 255, 0.45)',
    },
    '& .MuiSlider-thumb': {
      width: 22,
      height: 28,
      borderRadius: 4,
      background: 'linear-gradient(180deg, #2c3242 0%, #1e2430 50%, #121622 100%)',
      border: '1px solid #3b4356',
      boxShadow: '0 3px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 2px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      '&:hover, &.Mui-focusVisible': {
        borderColor: '#00d2ff',
        boxShadow: '0 0 12px rgba(0, 210, 255, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 2,
        right: 2,
        top: 2,
        height: 8,
        borderRadius: 2,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
        pointerEvents: 'none',
      },
      // Center indicator line glowing in Electric Neon Cyan
      '&::after': {
        content: '""',
        position: 'absolute',
        left: '15%',
        right: '15%',
        top: '48%',
        height: 2.5,
        borderRadius: 1,
        background: '#00d2ff',
        boxShadow: '0 0 6px #00d2ff',
        pointerEvents: 'none',
      },
    },
  };
});

const StyledInput = styled(Input)(() => ({
  '& input': {
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: '"Red Hat Mono", monospace',
    textAlign: 'center',
    width: '42px',
    backgroundColor: '#0b0e14',
    color: '#f8fafc',
    border: '1px solid #222938',
    borderRadius: 4,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    '&:focus': {
      borderColor: '#00d2ff',
      boxShadow: '0 0 8px rgba(0, 210, 255, 0.35)',
      backgroundColor: '#0e121a',
      outline: 'none',
    },
  },
  '&::before, &::after': {
    display: 'none',
  },
}));

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

export const ParameterFader: React.FC<ParameterFaderProps> = ({
  parameterId,
  min,
  max,
  skew = 'linear',
  label,
  scaleMarks,
  defaultValue,
  wheelStep = 1,
  wheelStepFine = 0.1,
  color = 'primary',
  active = true,
  sliderHeight,
  formatValue,
  suffix,
  inverted = false,
  disabled = false,
}) => {
  const SLIDER_HEIGHT = sliderHeight ?? 160;

  const { value, state: sliderState, setScaled } = useJuceSliderValue(parameterId);

  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const applyValue = (v: number) => {
    setScaled(v, min, max);
  };

  const formatted = formatValue ? formatValue(value) : value.toFixed(1);
  const displayInput = isEditing ? inputText : formatted;

  const sliderPosFromValue = (v: number): number => {
    const t = valueToNorm(v, min, max, skew);
    return (inverted ? 1 - t : t) * 100;
  };
  const valueFromSliderPos = (pos: number): number => {
    const t = pos / 100;
    return normToValue(inverted ? 1 - t : t, min, max, skew);
  };

  const handleChange = (_: Event, v: number | number[]) => {
    const n = v as number;
    applyValue(valueFromSliderPos(n));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value);
  const handleInputFocus = () => {
    setIsEditing(true);
    setInputText(formatted);
  };
  const commitInput = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputText);
    if (!isNaN(parsed)) applyValue(parsed);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  const fineDragStartRef = useRef<{ value: number; norm: number }>({ value: 0, norm: 0 });
  const handlePointerDownCapture = useFineAdjustPointer({
    orientation: 'vertical',
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
      const signed = inverted ? -deltaPx : deltaPx;
      if (skew === 'log') {
        const nextNorm = fineDragStartRef.current.norm + signed * 0.003;
        applyValue(normToValue(nextNorm, min, max, skew));
      } else {
        applyValue(fineDragStartRef.current.value + signed * wheelStepFine);
      }
    },
    onDragEnd: () => sliderState?.sliderDragEnded(),
  });

  const applyWheel = useEffectEvent((visualUp: 1 | -1, fine: boolean) => {
    const direction = inverted ? -visualUp : visualUp;
    const step = fine ? wheelStepFine : wheelStep;
    if (skew === 'log') {
      const normStep = step / 100;
      const curNorm = valueToNorm(value, min, max, skew);
      applyValue(normToValue(curNorm + normStep * direction, min, max, skew));
    } else {
      applyValue(value + step * direction);
    }
  });

  const wheelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const visualUp: 1 | -1 = -event.deltaY > 0 ? 1 : -1;
      const fine = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
      applyWheel(visualUp, fine);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel as EventListener);
    };
  }, []);

  const inputElRef = useRef<HTMLInputElement | null>(null);
  const inputDragStartRef = useRef<{ value: number; norm: number }>({ value: 0, norm: 0 });
  useNumberInputAdjust(inputElRef, {
    onWheelStep: (direction, fine) => {
      const signedDir = inverted ? -direction : direction;
      const step = fine ? wheelStepFine : wheelStep;
      if (skew === 'log') {
        const normStep = step / 100;
        const curNorm = valueToNorm(value, min, max, skew);
        applyValue(normToValue(curNorm + normStep * signedDir, min, max, skew));
      } else {
        applyValue(value + step * signedDir);
      }
    },
    onDragStart: () => {
      inputDragStartRef.current = {
        value: value,
        norm: valueToNorm(value, min, max, skew),
      };
      sliderState?.sliderDragStarted();
    },
    onDragDelta: (deltaY, fine) => {
      const signedDelta = inverted ? -deltaY : deltaY;
      if (skew === 'log') {
        const normStep = fine ? 0.003 : 0.01;
        applyValue(normToValue(inputDragStartRef.current.norm + signedDelta * normStep, min, max, skew));
      } else {
        const step = fine ? wheelStepFine : wheelStep;
        applyValue(inputDragStartRef.current.value + signedDelta * step);
      }
    },
    onDragEnd: () => sliderState?.sliderDragEnded(),
  });

  const controlDimSx = disabled
    ? { opacity: 0.4, pointerEvents: 'none' as const, transition: 'opacity 120ms' }
    : { transition: 'opacity 120ms' };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 60,
        position: 'relative',
      }}
    >
      <Box sx={{ height: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
        <Typography
          variant='caption'
          sx={{
            fontWeight: 700,
            fontSize: '0.70rem',
            color: active ? '#00d2ff' : 'text.secondary',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            lineHeight: 1,
            textShadow: active ? '0 0 8px rgba(0, 210, 255, 0.4)' : 'none',
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', height: SLIDER_HEIGHT, width: '100%', justifyContent: 'center', mb: '14px', ...controlDimSx }}>
        <Box
          sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          ref={wheelRef}
          onPointerDownCapture={handlePointerDownCapture}
        >
          <StyledSlider
            value={sliderPosFromValue(value)}
            onChange={handleChange}
            onMouseDown={() => {
              setIsDragging(true);
              sliderState?.sliderDragStarted();
            }}
            onMouseUp={() => {
              if (isDragging) {
                setIsDragging(false);
                sliderState?.sliderDragEnded();
              }
            }}
            onChangeCommitted={() => {
              if (isDragging) {
                setIsDragging(false);
                sliderState?.sliderDragEnded();
              }
            }}
            min={0}
            max={100}
            step={0.1}
            orientation='vertical'
            sx={{ color: active ? color : 'grey.500', height: SLIDER_HEIGHT }}
          />

          {scaleMarks && scaleMarks.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 'calc(50% + 18px)',
                height: SLIDER_HEIGHT,
                display: 'flex',
                flexDirection: 'column',
                width: 34,
              }}
            >
              {scaleMarks.map((mark) => (
                <Typography
                  key={mark.value}
                  sx={{
                    position: 'absolute',
                    bottom: `${sliderPosFromValue(mark.value)}%`,
                    transform: 'translateY(50%)',
                    fontSize: '9px',
                    color: '#94a3b8',
                    fontFamily: '"Red Hat Mono", monospace',
                    lineHeight: 1,
                    userSelect: 'none',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  {mark.label}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', mt: '10px', ...controlDimSx }}>
        <StyledInput
          className='block-host-shortcuts'
          inputRef={inputElRef}
          value={displayInput}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={commitInput}
          onKeyDown={handleInputKeyDown}
          disableUnderline
        />
        {suffix && (
          <Typography variant='caption' sx={{ ml: 0.25, fontSize: '10px', color: 'text.secondary', fontWeight: 600 }}>
            {suffix}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
