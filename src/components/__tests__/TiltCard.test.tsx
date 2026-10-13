import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TiltCard from '../TiltCard';

describe('TiltCard component', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders children and default classes properly', () => {
    render(
      <TiltCard className="custom-class">
        <p>Test Card Content</p>
      </TiltCard>
    );

    const card = screen.getByTestId('tilt-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('rounded-2xl');
    expect(screen.getByText('Test Card Content')).toBeInTheDocument();
  });

  it('updates transform on mouse move when hovered', async () => {
    jest.useFakeTimers();
    render(
      <TiltCard maxTilt={10} scale={1.05}>
        <p>Tilt Target</p>
      </TiltCard>
    );

    const card = screen.getByTestId('tilt-card');

    // Mock getBoundingClientRect
    jest.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 200,
      right: 300,
      bottom: 300,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(card);
    fireEvent.mouseMove(card, { clientX: 180, clientY: 150 });

    act(() => {
      // Run requestAnimationFrame callbacks
      jest.runAllTimers();
    });

    expect(card.style.transform).toContain('perspective(1000px)');
    expect(card.style.transform).toContain('scale3d(1.05, 1.05, 1.05)');

    jest.useRealTimers();
  });

  it('resets transform to neutral on mouse leave', () => {
    render(
      <TiltCard>
        <p>Tilt Reset</p>
      </TiltCard>
    );

    const card = screen.getByTestId('tilt-card');
    fireEvent.mouseLeave(card);

    expect(card.style.transform).toBe('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  });

  it('does not render glare overlay when glare prop is false', () => {
    const { container } = render(
      <TiltCard glare={false}>
        <p>No Glare</p>
      </TiltCard>
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeNull();
    expect(screen.queryByTestId('tilt-glare')).not.toBeInTheDocument();
  });

  it('renders glare overlay by default when glare prop is omitted or true', () => {
    render(
      <TiltCard>
        <p>With Glare</p>
      </TiltCard>
    );

    expect(screen.getByTestId('tilt-glare')).toBeInTheDocument();
  });

  it('disables 3D tilt, glare, and transitions when prefers-reduced-motion is active', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <TiltCard>
        <p>Accessible Motion</p>
      </TiltCard>
    );

    const card = screen.getByTestId('tilt-card');
    fireEvent.mouseEnter(card);
    fireEvent.mouseMove(card, { clientX: 150, clientY: 150 });

    expect(card.style.transform).toBe('');
    expect(card.style.transition).toBe('none');
    expect(screen.queryByTestId('tilt-glare')).not.toBeInTheDocument();
  });

  it('cancels pending animation frame cleanly on unmount', () => {
    const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(
      <TiltCard>
        <p>Unmount Test</p>
      </TiltCard>
    );

    const card = screen.getByTestId('tilt-card');
    fireEvent.mouseMove(card, { clientX: 10, clientY: 10 });
    unmount();

    expect(cancelSpy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });

  it('renders safely without throwing when matchMedia is undefined', () => {
    const originalMatchMedia = window.matchMedia;
    // @ts-expect-error simulating legacy browser without matchMedia
    delete window.matchMedia;

    expect(() => {
      render(
        <TiltCard>
          <p>No MatchMedia Environment</p>
        </TiltCard>
      );
    }).not.toThrow();

    expect(screen.getByText('No MatchMedia Environment')).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });
});
