import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentHistoryTable from './PaymentHistoryTable';

describe('PaymentHistoryTable', () => {
  const payments = [
    { id: 1, paid_at: '2024-03-15T10:00:00Z', amount_paid: 1500, receipt_ref: 'REC-001' },
    { id: 2, paid_at: '2024-04-20T10:00:00Z', amount_paid: 750.5, receipt_ref: null },
  ];

  it('renders table headers', () => {
    render(<PaymentHistoryTable payments={payments} />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Receipt Ref')).toBeInTheDocument();
  });

  it('renders a row for each payment', () => {
    render(<PaymentHistoryTable payments={payments} />);
    expect(screen.getByText('REC-001')).toBeInTheDocument();
    // Second payment has no receipt ref — shows em dash
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats amounts with two decimal places and R prefix', () => {
    render(<PaymentHistoryTable payments={payments} />);
    expect(screen.getByText('R 1500.00')).toBeInTheDocument();
    expect(screen.getByText('R 750.50')).toBeInTheDocument();
  });

  it('shows empty state message when payments array is empty', () => {
    render(<PaymentHistoryTable payments={[]} />);
    expect(screen.getByText('No payments recorded.')).toBeInTheDocument();
  });

  it('shows empty state message when payments prop is undefined', () => {
    render(<PaymentHistoryTable />);
    expect(screen.getByText('No payments recorded.')).toBeInTheDocument();
  });
});
