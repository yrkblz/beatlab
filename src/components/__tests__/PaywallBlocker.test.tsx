import React from 'react';
import { render, screen } from '@testing-library/react';
import PaywallBlocker from '../PaywallBlocker';

describe('PaywallBlocker component', () => {
  it('renders default toolName and 3-Day Free Trial Expired notice', () => {
    render(<PaywallBlocker />);

    expect(screen.getByTestId('paywall-blocker')).toBeInTheDocument();
    expect(screen.getByText(/3-Day Free Trial Expired/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Unlock Lifetime Access/i })).toBeInTheDocument();
    expect(screen.getByText(/\$29 USD/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Lifetime Access \(\$29\)/i })).toHaveAttribute(
      'href',
      '/upgrade'
    );
  });

  it('renders customized toolName in notice description', () => {
    render(<PaywallBlocker toolName="Placement CRM" />);

    expect(screen.getByText('Placement CRM')).toBeInTheDocument();
    expect(screen.getByText(/To continue using/i)).toBeInTheDocument();
  });
});
