import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsTable from './ResultsTable';

describe('ResultsTable', () => {
  const results = [
    { id: 1, subject: 'Mathematics', term: 'Term 1', marks: 88, grade: 'A' },
    { id: 2, subject: 'English', term: 'Term 1', marks: 72.5, grade: 'B' },
    { id: 3, subject: 'Science', term: 'Term 2', marks: 55, grade: 'C' },
    { id: 4, subject: 'History', term: 'Term 2', marks: 40, grade: 'D' },
    { id: 5, subject: 'Art', term: 'Term 3', marks: 30, grade: 'F' },
  ];

  it('renders table headers', () => {
    render(<ResultsTable results={results} />);
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('Term')).toBeInTheDocument();
    expect(screen.getByText('Marks')).toBeInTheDocument();
    expect(screen.getByText('Grade')).toBeInTheDocument();
  });

  it('renders a row for each result', () => {
    render(<ResultsTable results={results} />);
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
  });

  it('formats marks to one decimal place', () => {
    render(<ResultsTable results={results} />);
    expect(screen.getByText('88.0')).toBeInTheDocument();
    expect(screen.getByText('72.5')).toBeInTheDocument();
    expect(screen.getByText('55.0')).toBeInTheDocument();
  });

  it('renders grade letters', () => {
    render(<ResultsTable results={results} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('applies green colour class for grade A', () => {
    render(<ResultsTable results={[{ id: 1, subject: 'Maths', term: 'T1', marks: 90, grade: 'A' }]} />);
    expect(screen.getByText('A')).toHaveClass('text-green-600');
  });

  it('applies blue colour class for grade B', () => {
    render(<ResultsTable results={[{ id: 1, subject: 'Maths', term: 'T1', marks: 75, grade: 'B' }]} />);
    expect(screen.getByText('B')).toHaveClass('text-blue-600');
  });

  it('applies yellow colour class for grade C', () => {
    render(<ResultsTable results={[{ id: 1, subject: 'Maths', term: 'T1', marks: 60, grade: 'C' }]} />);
    expect(screen.getByText('C')).toHaveClass('text-yellow-600');
  });

  it('applies orange colour class for grade D', () => {
    render(<ResultsTable results={[{ id: 1, subject: 'Maths', term: 'T1', marks: 45, grade: 'D' }]} />);
    expect(screen.getByText('D')).toHaveClass('text-orange-600');
  });

  it('applies red colour class for grade F', () => {
    render(<ResultsTable results={[{ id: 1, subject: 'Maths', term: 'T1', marks: 30, grade: 'F' }]} />);
    expect(screen.getByText('F')).toHaveClass('text-red-600');
  });

  it('shows empty state message when results array is empty', () => {
    render(<ResultsTable results={[]} />);
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('shows empty state message when results prop is undefined', () => {
    render(<ResultsTable />);
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders term values in the table', () => {
    render(<ResultsTable results={results} />);
    // Multiple rows may share the same term — getAllByText is appropriate
    const term1Cells = screen.getAllByText('Term 1');
    expect(term1Cells.length).toBeGreaterThanOrEqual(1);
  });
});
