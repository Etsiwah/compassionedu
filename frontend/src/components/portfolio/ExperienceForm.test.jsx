import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the api module so no real HTTP calls are made
jest.mock('../../utils/api', () => ({
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
}));
import api from '../../utils/api';

import ExperienceForm from './ExperienceForm';

describe('ExperienceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Add Experience" heading when no initial data is provided', () => {
    render(<ExperienceForm studentId={1} />);
    expect(screen.getByText('Add Experience')).toBeInTheDocument();
  });

  it('renders "Edit Experience" heading when initial data is provided', () => {
    const initial = { id: 5, title: 'Intern', organization: 'Acme', start_date: '2023-01-01', end_date: '', description: '' };
    render(<ExperienceForm studentId={1} initial={initial} />);
    expect(screen.getByText('Edit Experience')).toBeInTheDocument();
  });

  it('pre-fills form fields with initial data', () => {
    const initial = { id: 5, title: 'Intern', organization: 'Acme Corp', start_date: '2023-01-01', end_date: '2023-06-30', description: 'Did stuff' };
    render(<ExperienceForm studentId={1} initial={initial} />);
    expect(screen.getByDisplayValue('Intern')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Did stuff')).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<ExperienceForm studentId={1} />);
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('renders a Save button', () => {
    render(<ExperienceForm studentId={1} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render a Cancel button when onCancel is not provided', () => {
    render(<ExperienceForm studentId={1} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders a Cancel button when onCancel is provided', () => {
    render(<ExperienceForm studentId={1} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onCancel when the Cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(<ExperienceForm studentId={1} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls api.post when submitting a new experience', async () => {
    render(<ExperienceForm studentId={7} />);
    await userEvent.type(screen.getByLabelText(/Title/i), 'Volunteer');
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2024-01-01');
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/portfolio/7/experiences',
        expect.objectContaining({ title: 'Volunteer' })
      );
    });
  });

  it('calls api.put when submitting an existing experience (edit mode)', async () => {
    const initial = { id: 3, title: 'Old Title', organization: '', start_date: '2022-01-01', end_date: '', description: '' };
    render(<ExperienceForm studentId={7} initial={initial} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form'));
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/portfolio/7/experiences/3',
        expect.objectContaining({ title: 'Old Title' })
      );
    });
  });

  it('calls onSaved callback after a successful submission', async () => {
    const onSaved = jest.fn();
    const initial = { id: 1, title: 'Dev', organization: '', start_date: '2023-01-01', end_date: '', description: '' };
    render(<ExperienceForm studentId={1} initial={initial} onSaved={onSaved} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('shows an error message when the API call fails', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Validation failed' } } });
    render(<ExperienceForm studentId={1} />);
    await userEvent.type(screen.getByLabelText(/Title/i), 'Test');
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2024-01-01');
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form'));
    expect(await screen.findByText('Validation failed')).toBeInTheDocument();
  });

  it('shows "Saving…" text while the save request is in flight', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));
    render(<ExperienceForm studentId={1} />);
    await userEvent.type(screen.getByLabelText(/Title/i), 'Test');
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2024-01-01');
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form'));
    expect(await screen.findByText('Saving…')).toBeInTheDocument();
  });
});
