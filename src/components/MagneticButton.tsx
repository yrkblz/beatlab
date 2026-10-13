'use client';

import React, { useRef, useState } from 'react';

export default function MagneticButton({
  children,
  className = '',
  maxDistance = 12,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  maxDistance?: number;
  [key: string]: any;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      (window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    // Gently pull towards cursor position
    const pullX = Math.max(-maxDistance, Math.min(maxDistance, distanceX * 0.28));
    const pullY = Math.max(-maxDistance, Math.min(maxDistance, distanceY * 0.28));

    setPosition({ x: pullX, y: pullY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition:
          position.x === 0 && position.y === 0
            ? 'transform 0.45s cubic-bezier(0.2, 0.9, 0.25, 1)'
            : 'transform 0.1s ease-out',
      }}
      className={`inline-block ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
