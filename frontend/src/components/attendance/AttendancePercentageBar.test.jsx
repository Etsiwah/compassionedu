import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendancePercentageBar from './AttendancePercentageBar';

describe('AttendancePercentageBar', () => {
  it('renders the percentage text', () => {
    render(<AttendancePercentageBar percentage={85} />);
    expect(screen.getByText('85.0%')).toBeInTheDocument();
  });

  it('uses green bar for percentage >= 75', () => {
    render(<AttendancePercentageBar percentage={80} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-green-500');
  });

  it('uses yellow bar for percentage between 50 and 74', () => {
    render(<AttendancePercentageBar percentage={60} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-yellow-500');
  });

  it('uses red bar for percentage below 50', () => {
    render(<AttendancePercentageBar percentage={40} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-red-500');
  });

  it('sets correct aria attributes on the progress bar', () => {
    render(<AttendancePercentageBar percentage={75} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('caps bar width at 100% for values over 100', () => {
    render(<AttendancePercentageBar percentage={120} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('defaults to 0 when percentage is not provided', () => {
    render(<AttendancePercentageBar />);
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });
});
