import React from 'react';
import { render, screen } from '@testing-library/react';
import LiveMetrics, { AnimatedCounter } from '../LiveMetrics';

describe('LiveMetrics and AnimatedCounter components', () => {
  describe('LiveMetrics showcase', () => {
    it('renders the live metrics showcase container and header', () => {
      render(<LiveMetrics />);

      expect(screen.getByTestId('live-metrics-showcase')).toBeInTheDocument();
      expect(screen.getByText('Trusted by Modern Independent Producers')).toBeInTheDocument();
      expect(screen.getByText(/Live Cloud Sync Active • 99.98% Uptime/i)).toBeInTheDocument();
    });

    it('renders all four production metric tilt cards', () => {
      render(<LiveMetrics />);

      expect(screen.getByText('Net Beat Sales Tracked')).toBeInTheDocument();
      expect(screen.getByText('Producer Contracts Signed')).toBeInTheDocument();
      expect(screen.getByText('Artist Outreach Deliverability')).toBeInTheDocument();
      expect(screen.getByText('Average Contract Setup')).toBeInTheDocument();

      expect(screen.getByText('Multi-currency ledger across USD, EUR & PLN')).toBeInTheDocument();
      expect(screen.getByText('100% Legally Binding')).toBeInTheDocument();
      expect(screen.getByText('Zero Domain Flags')).toBeInTheDocument();
      expect(screen.getByText('Instant One-Click')).toBeInTheDocument();
    });
  });

  describe('AnimatedCounter', () => {
    it('renders formatted values with decimals, prefix, and suffix', () => {
      render(
        <AnimatedCounter
          target={4.8}
          prefix="$"
          suffix="M+"
          decimals={1}
        />
      );

      expect(screen.getByText('$4.8M+')).toBeInTheDocument();
    });

    it('renders integer target with standard en-US thousand comma separators', () => {
      render(
        <AnimatedCounter
          target={142000}
          suffix="+"
          decimals={0}
        />
      );

      expect(screen.getByText('142,000+')).toBeInTheDocument();
    });

    it('renders prefix, value, and suffix correctly without decimals', () => {
      render(
        <AnimatedCounter
          target={28}
          prefix="< "
          suffix="s"
          decimals={0}
        />
      );

      expect(screen.getByText('< 28s')).toBeInTheDocument();
    });

    it('safely handles zero or minimal duration without throwing or NaN', () => {
      render(
        <AnimatedCounter
          target={50}
          duration={0}
          suffix="%"
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });
});
