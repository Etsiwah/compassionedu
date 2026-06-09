import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the api module so no real HTTP calls are made
jest.mock('../../utils/api', () => ({
  patch: jest.fn(() => Promise.resolve({ data: {} })),
}));
import api from '../../utils/api';

import SkillsEditor from './SkillsEditor';

describe('SkillsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders existing skills as tags', () => {
    render(<SkillsEditor studentId={1} skills={['React', 'Node.js']} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders an empty list when no skills are provided', () => {
    render(<SkillsEditor studentId={1} />);
    // No skill tags — only the input and buttons should be present
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
  });

  it('renders the skill input field', () => {
    render(<SkillsEditor studentId={1} />);
    expect(screen.getByPlaceholderText('Add a skill…')).toBeInTheDocument();
  });

  it('adds a new skill when the Add button is clicked', async () => {
    render(<SkillsEditor studentId={1} skills={[]} />);
    const input = screen.getByPlaceholderText('Add a skill…');
    await userEvent.type(input, 'Python');
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it('adds a new skill when Enter is pressed in the input', async () => {
    render(<SkillsEditor studentId={1} skills={[]} />);
    const input = screen.getByPlaceholderText('Add a skill…');
    await userEvent.type(input, 'TypeScript{enter}');
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('does not add a duplicate skill', async () => {
    render(<SkillsEditor studentId={1} skills={['React']} />);
    const input = screen.getByPlaceholderText('Add a skill…');
    await userEvent.type(input, 'React');
    fireEvent.click(screen.getByText('Add'));
    // Still only one "React" tag
    expect(screen.getAllByText('React')).toHaveLength(1);
  });

  it('does not add an empty or whitespace-only skill', async () => {
    render(<SkillsEditor studentId={1} skills={[]} />);
    const input = screen.getByPlaceholderText('Add a skill…');
    await userEvent.type(input, '   ');
    fireEvent.click(screen.getByText('Add'));
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
  });

  it('removes a skill when its remove button is clicked', async () => {
    render(<SkillsEditor studentId={1} skills={['React', 'CSS']} />);
    const removeBtn = screen.getByRole('button', { name: 'Remove React' });
    fireEvent.click(removeBtn);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText('CSS')).toBeInTheDocument();
  });

  it('calls api.patch with the current skill list on save', async () => {
    render(<SkillsEditor studentId={42} skills={['HTML', 'CSS']} />);
    fireEvent.click(screen.getByText('Save skills'));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/portfolio/42/skills', { skills: ['HTML', 'CSS'] });
    });
  });

  it('calls onSaved callback after a successful save', async () => {
    const onSaved = jest.fn();
    render(<SkillsEditor studentId={1} skills={['JS']} onSaved={onSaved} />);
    fireEvent.click(screen.getByText('Save skills'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('shows "Saving…" text while the save request is in flight', async () => {
    // Make the API call hang so we can observe the loading state
    api.patch.mockImplementation(() => new Promise(() => {}));
    render(<SkillsEditor studentId={1} skills={['JS']} />);
    fireEvent.click(screen.getByText('Save skills'));
    expect(await screen.findByText('Saving…')).toBeInTheDocument();
  });
});
