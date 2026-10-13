'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
}

export default function TiltCard({
  children,
  className = '',
  maxTilt = 8,
  scale = 1.02,
  glare = true,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [transform, setTransform] = useState<string>('');
  const [glareStyle, setGlareStyle] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return;
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;
      if (!cardRef.current) return;

      // Ignore on touch-only devices without hover
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) {
        return;
      }

      const clientX = e.clientX;
      const clientY = e.clientY;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const xPct = Math.max(0, Math.min(1, x / rect.width));
        const yPct = Math.max(0, Math.min(1, y / rect.height));

        const rotateY = (xPct - 0.5) * (maxTilt * 2);
        const rotateX = -(yPct - 0.5) * (maxTilt * 2);

        setTransform(
          `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
        );

        if (glare) {
          setGlareStyle({
            x: Math.round(xPct * 100),
            y: Math.round(yPct * 100),
            opacity: 0.12,
          });
        }
      });
    },
    [maxTilt, scale, glare, prefersReducedMotion]
  );

  const handleMouseEnter = useCallback(() => {
    if (prefersReducedMotion) return;
    setIsHovered(true);
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setIsHovered(false);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlareStyle((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="tilt-card"
      className={`relative will-change-transform rounded-2xl ${className}`}
      style={{
        transform: prefersReducedMotion ? undefined : transform || undefined,
        transformStyle: prefersReducedMotion ? undefined : 'preserve-3d',
        transition: prefersReducedMotion
          ? 'none'
          : isHovered
          ? 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.2s ease'
          : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease',
      }}
    >
      {children}
      {glare && !prefersReducedMotion && (
        <div
          data-testid="tilt-glare"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl transition-opacity duration-300"
          style={{
            opacity: glareStyle.opacity,
            background: `radial-gradient(circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 60%)`,
            borderRadius: 'inherit',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
