'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, Sliders } from 'lucide-react';

interface AudioWaveformProps {
  className?: string;
}

const PRESETS = [
  {
    name: 'Trap 808 Master',
    bpm: 140,
    key: 'F Minor',
    peak: '-0.2 dB',
    genre: 'Trap',
    bars: [
      35, 60, 85, 95, 90, 75, 55, 65, 80, 88, 70, 55, 45, 50, 60, 75,
      82, 68, 50, 42, 55, 70, 78, 85, 72, 58, 45, 38, 28, 22, 18, 14,
    ],
  },
  {
    name: 'Drill Slide Banger',
    bpm: 144,
    key: 'C# Minor',
    peak: '-0.1 dB',
    genre: 'UK Drill',
    bars: [
      25, 45, 70, 85, 98, 92, 85, 90, 95, 88, 75, 65, 58, 62, 70, 85,
      90, 78, 60, 52, 65, 80, 88, 92, 80, 68, 52, 40, 32, 24, 18, 15,
    ],
  },
  {
    name: 'Soulful Boombap',
    bpm: 90,
    key: 'Eb Major',
    peak: '-0.5 dB',
    genre: 'Boom Bap',
    bars: [
      20, 35, 50, 65, 75, 80, 85, 90, 88, 82, 78, 75, 70, 68, 72, 76,
      74, 68, 62, 58, 55, 60, 65, 62, 55, 48, 40, 32, 25, 20, 16, 12,
    ],
  },
];

export function MiniAudioEqualizer({
  bars = 6,
  active = true,
  className = '',
}: {
  bars?: number;
  active?: boolean;
  className?: string;
}) {
  const [pulseHeights, setPulseHeights] = useState<number[]>(() =>
    Array.from({ length: bars }, (_, i) => [40, 75, 95, 60, 85, 50, 70, 90][i % 8] ?? 50)
  );

  useEffect(() => {
    setPulseHeights(
      Array.from({ length: bars }, (_, i) => [40, 75, 95, 60, 85, 50, 70, 90][i % 8] ?? 50)
    );
  }, [bars]);

  useEffect(() => {
    if (!active) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setPulseHeights(Array.from({ length: bars }, () => Math.floor(Math.random() * 65) + 30));
    }, 180);
    return () => clearInterval(interval);
  }, [active, bars]);

  return (
    <div
      data-testid="mini-audio-equalizer"
      className={`inline-flex items-end gap-0.5 h-[18px] px-1 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => {
        const height = active ? pulseHeights[i] ?? 50 : 25;
        return (
          <span
            key={i}
            className="w-1 bg-current rounded-full transition-all duration-150 ease-in-out"
            style={{
              height: `${height}%`,
              minHeight: '3px',
            }}
          />
        );
      })}
    </div>
  );
}

export default function AudioWaveform({ className = '' }: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const currentPreset = PRESETS[selectedPresetIndex];

  // Frequency spectrum bar heights (32 bars) anchored to selected preset
  const [barHeights, setBarHeights] = useState<number[]>(PRESETS[0].bars);

  useEffect(() => {
    setBarHeights(PRESETS[selectedPresetIndex].bars);
  }, [selectedPresetIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const baseline = PRESETS[selectedPresetIndex].bars;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setBarHeights(
        baseline.map((base, idx) => {
          // Dynamic rhythm fluctuation based on bar index (sub-bass higher on left, shimmer on right)
          const weight = idx < 8 ? 0.35 : idx < 20 ? 0.45 : 0.25;
          const randomJitter = (Math.random() - 0.5) * 35;
          const newHeight = Math.max(12, Math.min(100, base + randomJitter * weight));
          return Math.round(newHeight);
        })
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying, selectedPresetIndex]);

  return (
    <div
      data-testid="audio-waveform-visualizer"
      className={`bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {/* Visualizer Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause studio audio preview' : 'Play studio audio preview'}
            className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center hover:bg-neutral-800 transition-transform active:scale-95 shadow-sm group"
          >
            {isPlaying ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} className="translate-x-0.5" aria-hidden="true" />
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                {currentPreset.name}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {currentPreset.bpm} BPM
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
              <span>Key: {currentPreset.key}</span>
              <span>•</span>
              <span>True Peak: {currentPreset.peak}</span>
            </p>
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div
          role="tablist"
          aria-label="Audio genre presets"
          className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200/80 text-xs"
        >
          {PRESETS.map((preset, idx) => (
            <button
              key={preset.name}
              type="button"
              role="tab"
              aria-selected={selectedPresetIndex === idx}
              onClick={() => setSelectedPresetIndex(idx)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedPresetIndex === idx
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-black hover:bg-white/50'
              }`}
            >
              {preset.genre}
            </button>
          ))}
        </div>
      </div>

      {/* Waveform Equalizer Canvas Display */}
      <div className="pt-6 pb-2">
        <div className="h-28 sm:h-32 flex items-end justify-between gap-1 sm:gap-1.5 px-2 bg-gradient-to-b from-gray-50/40 to-gray-50/90 rounded-xl border border-gray-100/80 p-3">
          {barHeights.map((h, i) => {
            // Emphasize mid-peak bars with subtle gradient
            const isHigh = h > 75;
            const isMid = h > 50 && h <= 75;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end items-center h-full group"
              >
                <div
                  className={`w-full rounded-full transition-all duration-120 ease-out ${
                    isPlaying
                      ? isHigh
                        ? 'bg-black shadow-[0_0_8px_rgba(0,0,0,0.15)]'
                        : isMid
                        ? 'bg-gray-800'
                        : 'bg-gray-400'
                      : 'bg-gray-300'
                  }`}
                  style={{
                    height: isPlaying ? `${h}%` : '20%',
                    minHeight: '6px',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Audio Visualizer Sub-Labels */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 px-1 font-mono">
          <span className="flex items-center gap-1">
            <Sliders size={12} aria-hidden="true" /> Sub 20-60Hz
          </span>
          <span>Bass 60-250Hz</span>
          <span>Mid 250-4kHz</span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <Volume2 size={12} aria-hidden="true" /> Air 10-20kHz • Master Limiter ON
          </span>
        </div>
      </div>
    </div>
  );
}
