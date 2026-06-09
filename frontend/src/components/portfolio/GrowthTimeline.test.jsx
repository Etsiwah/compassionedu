import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GrowthTimeline from './GrowthTimeline';

describe('GrowthTimeline', () => {
  const experiences = [
    {
      id: 1,
      title: 'Software Intern',
      organization: 'TechCorp',
      start_date: '2023-06-01',
      end_date: '2023-08-31',
      description: 'Worked on backend APIs.',
    },
    {
      id: 2,
      title: 'Volunteer Tutor',
      organization: 'Community Centre',
      start_date: '2022-01-15',
      end_date: null,
      description: 'Tutored maths students.',
    },
    {
      id: 3,
      title: 'Research Assistant',
      organization: 'University Lab',
      start_date: '2024-02-01',
      end_date: '2024-05-31',
      description: null,
    },
  ];

  it('renders all experience titles', () => {
    render(<GrowthTimeline experiences={experiences} />);
    expect(screen.getByText('Software Intern')).toBeInTheDocument();
    expect(screen.getByText('Volunteer Tutor')).toBeInTheDocument();
    expect(screen.getByText('Research Assistant')).toBeInTheDocument();
  });

  it('renders entries in chronological order (ascending start_date)', () => {
    render(<GrowthTimeline experiences={experiences} />);
    const headings = screen.getAllByRole('heading', { level: 4 });
    // Expected order: Volunteer Tutor (2022) → Software Intern (2023) → Research Assistant (2024)
    expect(headings[0]).toHaveTextContent('Volunteer Tutor');
    expect(headings[1]).toHaveTextContent('Software Intern');
    expect(headings[2]).toHaveTextContent('Research Assistant');
  });

  it('renders organization names', () => {
    render(<GrowthTimeline experiences={experiences} />);
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('Community Centre')).toBeInTheDocument();
    expect(screen.getByText('University Lab')).toBeInTheDocument();
  });

  it('renders descriptions when provided', () => {
    render(<GrowthTimeline experiences={experiences} />);
    expect(screen.getByText('Worked on backend APIs.')).toBeInTheDocument();
    expect(screen.getByText('Tutored maths students.')).toBeInTheDocument();
  });

  it('does not render description element when description is null', () => {
    render(<GrowthTimeline experiences={experiences} />);
    // Research Assistant has no description — only 2 description paragraphs should appear
    const descriptions = screen.queryAllByText(/Worked on|Tutored/);
    expect(descriptions).toHaveLength(2);
  });

  it('shows empty state message when no experiences are provided', () => {
    render(<GrowthTimeline experiences={[]} />);
    expect(screen.getByText('No experiences added yet.')).toBeInTheDocument();
  });

  it('shows empty state message when experiences prop is omitted', () => {
    render(<GrowthTimeline />);
    expect(screen.getByText('No experiences added yet.')).toBeInTheDocument();
  });

  it('renders as an ordered list', () => {
    const { container } = render(<GrowthTimeline experiences={experiences} />);
    expect(container.querySelector('ol')).toBeInTheDocument();
  });
});
