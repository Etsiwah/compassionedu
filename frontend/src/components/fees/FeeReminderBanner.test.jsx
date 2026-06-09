import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeeReminderBanner from './FeeReminderBanner';

/**
 * Helpers to build fee records relative to "now" so tests stay
 * time-independent.
 */
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('FeeReminderBanner', () => {
  it('renders null when there are no upcoming pending fees', () => {
    const { container } = render(<FeeReminderBanner fees={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when all fees are already paid', () => {
    const fees = [
      { id: 1, status: 'paid', due_date: daysFromNow(3) },
      { id: 2, status: 'paid', due_date: daysFromNow(1) },
    ];
    const { container } = render(<FeeReminderBanner fees={fees} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when pending fees are overdue (past due date)', () => {
    const fees = [{ id: 1, status: 'pending', due_date: daysFromNow(-1) }];
    const { container } = render(<FeeReminderBanner fees={fees} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when pending fees are more than 7 days away', () => {
    const fees = [{ id: 1, status: 'pending', due_date: daysFromNow(8) }];
    const { container } = render(<FeeReminderBanner fees={fees} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a banner when there is one pending fee due within 7 days', () => {
    const fees = [{ id: 1, status: 'pending', due_date: daysFromNow(3) }];
    render(<FeeReminderBanner fees={fees} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/1 fee payment/)).toBeInTheDocument();
  });

  it('uses singular "payment" for exactly one upcoming fee', () => {
    const fees = [{ id: 1, status: 'pending', due_date: daysFromNow(2) }];
    render(<FeeReminderBanner fees={fees} />);
    // Should NOT contain "payments" (plural)
    expect(screen.queryByText(/payments/)).not.toBeInTheDocument();
    expect(screen.getByText(/1 fee payment/)).toBeInTheDocument();
  });

  it('uses plural "payments" for multiple upcoming fees', () => {
    const fees = [
      { id: 1, status: 'pending', due_date: daysFromNow(1) },
      { id: 2, status: 'pending', due_date: daysFromNow(5) },
    ];
    render(<FeeReminderBanner fees={fees} />);
    expect(screen.getByText(/2 fee payments/)).toBeInTheDocument();
  });

  it('counts only pending fees within 7 days, ignoring paid and overdue', () => {
    const fees = [
      { id: 1, status: 'pending', due_date: daysFromNow(2) },   // included
      { id: 2, status: 'paid', due_date: daysFromNow(1) },       // excluded (paid)
      { id: 3, status: 'pending', due_date: daysFromNow(10) },   // excluded (too far)
      { id: 4, status: 'overdue', due_date: daysFromNow(3) },    // excluded (overdue status)
    ];
    render(<FeeReminderBanner fees={fees} />);
    expect(screen.getByText(/1 fee payment/)).toBeInTheDocument();
  });

  it('renders the banner with role="alert"', () => {
    const fees = [{ id: 1, status: 'pending', due_date: daysFromNow(0) }];
    render(<FeeReminderBanner fees={fees} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('includes the "due within 7 days" message', () => {
    const fees = [{ id: 1, status: 'pending', due_date: daysFromNow(4) }];
    render(<FeeReminderBanner fees={fees} />);
    expect(screen.getByText(/due within 7 days/)).toBeInTheDocument();
  });
});
