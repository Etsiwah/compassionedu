import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceCalendar from './AttendanceCalendar';

describe('AttendanceCalendar', () => {
  const month = '2024-06'; // June 2024 — 30 days, starts on Saturday (day 6)

  it('renders day-of-week headers', () => {
    render(<AttendanceCalendar month={month} />);
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('renders all days of the month', () => {
    render(<AttendanceCalendar month={month} />);
    // June has 30 days
    for (let d = 1; d <= 30; d++) {
      expect(screen.getByText(String(d))).toBeInTheDocument();
    }
  });

  it('marks a present day with the correct title attribute', () => {
    const records = [{ date: '2024-06-03', status: 'present' }];
    render(<AttendanceCalendar records={records} month={month} />);
    const day3 = screen.getByTitle('present');
    expect(day3).toBeInTheDocument();
    expect(day3).toHaveClass('bg-green-400');
  });

  it('marks an absent day with the correct title attribute', () => {
    const records = [{ date: '2024-06-10', status: 'absent' }];
    render(<AttendanceCalendar records={records} month={month} />);
    const day10 = screen.getByTitle('absent');
    expect(day10).toBeInTheDocument();
    expect(day10).toHaveClass('bg-red-400');
  });

  it('marks a late day with the correct title attribute', () => {
    const records = [{ date: '2024-06-15', status: 'late' }];
    render(<AttendanceCalendar records={records} month={month} />);
    const day15 = screen.getByTitle('late');
    expect(day15).toBeInTheDocument();
    expect(day15).toHaveClass('bg-yellow-400');
  });

  it('shows "no record" title for days without attendance data', () => {
    render(<AttendanceCalendar records={[]} month={month} />);
    const noRecordDays = screen.getAllByTitle('no record');
    expect(noRecordDays.length).toBe(30);
  });

  it('renders the legend with Present, Absent, and Late labels', () => {
    render(<AttendanceCalendar month={month} />);
    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('Absent')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
  });

  it('renders without errors when no props are provided', () => {
    // Should use current month and empty records
    expect(() => render(<AttendanceCalendar />)).not.toThrow();
  });
});
