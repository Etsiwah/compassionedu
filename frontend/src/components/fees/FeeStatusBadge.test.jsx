import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeeStatusBadge from './FeeStatusBadge';

describe('FeeStatusBadge', () => {
  it('renders the status text', () => {
    render(<FeeStatusBadge status="paid" />);
    expect(screen.getByText('paid')).toBeInTheDocument();
  });

  it('applies green styles for paid status', () => {
    render(<FeeStatusBadge status="paid" />);
    const badge = screen.getByText('paid');
    expect(badge).toHaveClass('bg-green-100');
    expect(badge).toHaveClass('text-green-700');
  });

  it('applies yellow styles for pending status', () => {
    render(<FeeStatusBadge status="pending" />);
    const badge = screen.getByText('pending');
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-700');
  });

  it('applies red styles for overdue status', () => {
    render(<FeeStatusBadge status="overdue" />);
    const badge = screen.getByText('overdue');
    expect(badge).toHaveClass('bg-red-100');
    expect(badge).toHaveClass('text-red-700');
  });

  it('falls back to pending styles for unknown status', () => {
    render(<FeeStatusBadge status="unknown" />);
    const badge = screen.getByText('unknown');
    // Falls back to pending styles
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-700');
  });

  it('renders as an inline span element', () => {
    render(<FeeStatusBadge status="paid" />);
    const badge = screen.getByText('paid');
    expect(badge.tagName).toBe('SPAN');
  });
});
