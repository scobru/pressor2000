// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 scobru
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { juceBridge } from '../bridge/juce';
import { useJuceSliderValue } from '../hooks/useJuceParam';

// ============================================================================
// WaveformView
// ============================================================================
//  Oscilloscope (~7s scrollback):
//  - Right edge = now, scrolling leftwards
//  - Vertical axis 0 dB (top) .. -60 dB (bottom)
//  - Electric Cyan envelope, warm amber threshold line and GR reflection

const MIN_DB = -60;
const TARGET_DB_AT_MID = -24;
const LINEAR_AT_TARGET = (TARGET_DB_AT_MID - MIN_DB) / (0 - MIN_DB);
const VISUAL_EXPONENT = Math.log(0.5) / Math.log(Math.max(1e-6, LINEAR_AT_TARGET));

const dbToUnit = (db: number): number => {
  const clamped = Math.max(MIN_DB, Math.min(0, db));
  const linear = (clamped - MIN_DB) / (0 - MIN_DB);
  return Math.pow(linear, VISUAL_EXPONENT);
};
const dbToY = (db: number, h: number): number => h - dbToUnit(db) * h;

const linToDb = (lin: number): number => {
  if (lin <= 1e-6) return MIN_DB;
  return 20 * Math.log10(lin);
};

const setupHiDPICanvas = (canvas: HTMLCanvasElement, cssW: number, cssH: number): CanvasRenderingContext2D | null => {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
};

const crisp = (v: number, dpr: number): number => Math.round(v * dpr) / dpr + 0.5 / dpr;

const DB_GRID_LEVELS: readonly number[] = [-6, -12, -24, -40];
const DB_SCALE_MARKS: ReadonlyArray<readonly [number, string]> = [
  [  0,   '0'],
  [ -6,  '-6'],
  [-12, '-12'],
  [-24, '-24'],
  [-40, '-40'],
  [-60, '-60'],
];

interface WaveformUpdateData {
  sliceHz?: number;
  peaks?: number[];
  grDb?: number[];
}

interface WaveformViewProps {
  width: number;
  height: number;
  seconds?: number;
  sliceHz?: number;
  isResizing?: boolean;
}

export const WaveformView: React.FC<WaveformViewProps> = ({
  width,
  height,
  seconds = 7,
  sliceHz = 200,
  isResizing = false,
}) => {
  const { value: thresholdDb } = useJuceSliderValue('THRESHOLD');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const bufferLen = Math.max(16, Math.round(sliceHz * seconds));
  const peaksRef = useRef<Float32Array | null>(null);
  const grDbRef = useRef<Float32Array | null>(null);
  const writeIdxRef = useRef<number>(0);

  useLayoutEffect(() => {
    if (!peaksRef.current || peaksRef.current.length !== bufferLen) {
      peaksRef.current = new Float32Array(bufferLen);
      grDbRef.current = new Float32Array(bufferLen);
      writeIdxRef.current = 0;
    }
  }, [bufferLen]);

  const thresholdRef = useRef<number>(thresholdDb);
  const isResizingRef = useRef<boolean>(isResizing);
  const sizeRef = useRef<{ w: number; h: number }>({ w: width, h: height });
  useLayoutEffect(() => {
    thresholdRef.current = thresholdDb;
    isResizingRef.current = isResizing;
    sizeRef.current = { w: width, h: height };
  });

  const drawRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isResizing) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      return;
    }

    const ctx = setupHiDPICanvas(canvas, width, height);
    if (!ctx) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    drawRef.current = () => {
      if (isResizingRef.current) return;

      const { w: cssW, h: cssH } = sizeRef.current;
      const threshold = thresholdRef.current;
      const peaks = peaksRef.current!;
      const grDbs = grDbRef.current!;
      if (!peaks || !grDbs) return;

      const writeIdx = writeIdxRef.current;
      const len = peaks.length;

      // ---- 背景 ----
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 0, cssW, cssH);

      // ---- dB グリッド ----
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (const db of DB_GRID_LEVELS) {
        const y = crisp(dbToY(db, cssH), dpr);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cssW, y);
        ctx.stroke();
      }

      // ---- 波形エンベロープ (Electric Neon Cyan) ----
      const pxPerSlice = cssW / len;
      const envGrad = ctx.createLinearGradient(0, 0, 0, cssH);
      envGrad.addColorStop(0.00, 'rgba(0, 210, 255, 0.95)');
      envGrad.addColorStop(0.35, 'rgba(0, 210, 255, 0.75)');
      envGrad.addColorStop(0.70, 'rgba(0, 210, 255, 0.35)');
      envGrad.addColorStop(0.92, 'rgba(0, 210, 255, 0.08)');
      envGrad.addColorStop(1.00, 'rgba(0, 210, 255, 0.01)');
      ctx.fillStyle = envGrad;
      ctx.beginPath();
      ctx.moveTo(0, cssH);
      for (let i = 0; i < len; ++i) {
        const bufIdx = (writeIdx + i) % len;
        const peak = peaks[bufIdx];
        const db = linToDb(peak);
        const y = dbToY(db, cssH);
        const x = i * pxPerSlice;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cssW, cssH);
      ctx.closePath();
      ctx.fill();

      // ---- Threshold 超過部分のハイライト ----
      const yThreshold = dbToY(Math.max(MIN_DB, threshold), cssH);
      if (yThreshold > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, cssW, yThreshold);
        ctx.clip();

        const overGrad = ctx.createLinearGradient(0, 0, 0, cssH);
        overGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.85)');
        overGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.65)');
        overGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.30)');
        overGrad.addColorStop(0.92, 'rgba(255, 255, 255, 0.08)');
        overGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.01)');
        ctx.fillStyle = overGrad;
        ctx.beginPath();
        ctx.moveTo(0, cssH);
        for (let i = 0; i < len; ++i) {
          const bufIdx = (writeIdx + i) % len;
          const peak = peaks[bufIdx];
          const db = linToDb(peak);
          const y = dbToY(db, cssH);
          const x = i * pxPerSlice;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(cssW, cssH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ---- GR を threshold 線から下方向に反転描画 (Warm Amber to Red) ----
      if (yThreshold < cssH) {
        const grGrad = ctx.createLinearGradient(0, yThreshold, 0, cssH);
        grGrad.addColorStop(0.00, 'rgba(255, 159, 28, 0.85)');
        grGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.70)');
        grGrad.addColorStop(0.70, 'rgba(239, 68, 68, 0.40)');
        grGrad.addColorStop(0.92, 'rgba(239, 68, 68, 0.08)');
        grGrad.addColorStop(1.00, 'rgba(239, 68, 68, 0.01)');
        ctx.fillStyle = grGrad;
        ctx.beginPath();
        ctx.moveTo(0, yThreshold);
        for (let i = 0; i < len; ++i) {
          const bufIdx = (writeIdx + i) % len;
          const gr = grDbs[bufIdx];
          if (gr <= 0.01) {
            const x = i * pxPerSlice;
            ctx.lineTo(x, yThreshold);
            continue;
          }
          const reducedDb = Math.max(MIN_DB, Math.max(MIN_DB, threshold) - gr);
          const y = dbToY(reducedDb, cssH);
          const x = i * pxPerSlice;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(cssW, yThreshold);
        ctx.closePath();
        ctx.fill();
      }

      // ---- 右端内側 dB 目盛りラベル ----
      ctx.save();
      ctx.font = '9px "Red Hat Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(11, 14, 20, 0.8)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (const [db, label] of DB_SCALE_MARKS) {
        let y = dbToY(db, cssH);
        const padY = 6;
        y = Math.max(padY, Math.min(cssH - padY, y));
        ctx.strokeText(label, cssW - 4, y);
        ctx.fillText(label, cssW - 4, y);
      }
      ctx.restore();

      // ---- Threshold 水平線 (Amber dashed) ----
      if (threshold < 0) {
        ctx.strokeStyle = 'rgba(255, 159, 28, 0.9)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        const y = crisp(yThreshold, dpr);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cssW, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    drawRef.current();
  }, [width, height, bufferLen, isResizing]);

  useEffect(() => {
    const id = juceBridge.addEventListener('waveformUpdate', (d: unknown) => {
      const wf = d as WaveformUpdateData;
      const ps = wf.peaks;
      const gs = wf.grDb;
      if (!ps || !gs) return;
      const n = Math.min(ps.length, gs.length);
      if (n === 0) return;

      const peaks = peaksRef.current!;
      const grDbs = grDbRef.current!;
      const len = peaks.length;
      let w = writeIdxRef.current;
      for (let i = 0; i < n; ++i) {
        peaks[w] = ps[i];
        grDbs[w] = gs[i];
        w = (w + 1) % len;
      }
      writeIdxRef.current = w;

      drawRef.current();
    });
    return () => juceBridge.removeEventListener(id);
  }, []);

  useEffect(() => {
    drawRef.current();
  }, [thresholdDb]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ height: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pb: 0.25 }}>
        <Typography variant='caption' sx={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.8px', lineHeight: 1 }}>
          WAVEFORM
        </Typography>
      </Box>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ borderRadius: 6, border: '1px solid #222938', width, height }}
      />
    </Box>
  );
};
