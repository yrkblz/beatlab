import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AudioWaveform, { MiniAudioEqualizer } from '../AudioWaveform';

describe('AudioWaveform and MiniAudioEqualizer components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AudioWaveform Visualizer', () => {
    it('renders the audio waveform visualizer with default preset info', () => {
      render(<AudioWaveform />);

      expect(screen.getByTestId('audio-waveform-visualizer')).toBeInTheDocument();
      expect(screen.getByText('Trap 808 Master')).toBeInTheDocument();
      expect(screen.getByText('140 BPM')).toBeInTheDocument();
      expect(screen.getByText(/Key: F Minor/i)).toBeInTheDocument();
      expect(screen.getByText(/True Peak: -0.2 dB/i)).toBeInTheDocument();
    });

    it('toggles playback state and updates button aria-label when play/pause is clicked', () => {
      render(<AudioWaveform />);

      const toggleButton = screen.getByRole('button', { name: /pause studio audio preview/i });
      expect(toggleButton).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.getByRole('button', { name: /play studio audio preview/i })).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.getByRole('button', { name: /pause studio audio preview/i })).toBeInTheDocument();
    });

    it('switches preset details when genre chip is clicked', () => {
      render(<AudioWaveform />);

      const drillButton = screen.getByRole('tab', { name: /UK Drill/i });
      fireEvent.click(drillButton);

      expect(screen.getByText('Drill Slide Banger')).toBeInTheDocument();
      expect(screen.getByText('144 BPM')).toBeInTheDocument();
      expect(screen.getByText(/Key: C# Minor/i)).toBeInTheDocument();
      expect(drillButton).toHaveAttribute('aria-selected', 'true');

      const boomBapButton = screen.getByRole('tab', { name: /Boom Bap/i });
      fireEvent.click(boomBapButton);

      expect(screen.getByText('Soulful Boombap')).toBeInTheDocument();
      expect(screen.getByText('90 BPM')).toBeInTheDocument();
      expect(screen.getByText(/Key: Eb Major/i)).toBeInTheDocument();
    });

    it('renders 32 frequency bars matching the preset spectrum', () => {
      const { container } = render(<AudioWaveform />);
      const visualizer = screen.getByTestId('audio-waveform-visualizer');
      const barElements = visualizer.querySelectorAll('.h-28 > div, .sm\\:h-32 > div');
      expect(barElements.length).toBe(32);
    });

    it('cleans up interval on unmount without errors', () => {
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
      const { unmount } = render(<AudioWaveform />);
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('MiniAudioEqualizer', () => {
    it('renders requested number of equalizer bars with explicit h-[18px] container', () => {
      const { container } = render(<MiniAudioEqualizer bars={8} />);
      const bars = container.querySelectorAll('span');
      expect(bars.length).toBe(8);
      const equalizer = screen.getByTestId('mini-audio-equalizer');
      expect(equalizer).toBeInTheDocument();
      expect(equalizer).toHaveClass('h-[18px]');
    });

    it('renders inactive static bars when active is false', () => {
      const { container } = render(<MiniAudioEqualizer bars={4} active={false} />);
      const bars = container.querySelectorAll('span');
      expect(bars.length).toBe(4);
      bars.forEach((bar) => {
        expect(bar.style.height).toBe('25%');
      });
    });

    it('renders correctly with 3 bars for inline placement badges', () => {
      const { container } = render(<MiniAudioEqualizer bars={3} />);
      const bars = container.querySelectorAll('span');
      expect(bars.length).toBe(3);
    });
  });
});
