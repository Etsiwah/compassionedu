import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileCard from './ProfileCard';

describe('ProfileCard', () => {
  const profile = {
    name: 'Amara Osei',
    email: 'amara@school.edu',
    role: 'student',
    phone: '+27 82 000 0000',
    address: 'Cape Town, South Africa',
    photo_url: 'https://example.com/photo.jpg',
  };

  it('renders the student name', () => {
    render(<ProfileCard profile={profile} />);
    expect(screen.getByText('Amara Osei')).toBeInTheDocument();
  });

  it('renders the email address', () => {
    render(<ProfileCard profile={profile} />);
    expect(screen.getByText('amara@school.edu')).toBeInTheDocument();
  });

  it('renders the role', () => {
    render(<ProfileCard profile={profile} />);
    expect(screen.getByText('student')).toBeInTheDocument();
  });

  it('renders phone and address when provided', () => {
    render(<ProfileCard profile={profile} />);
    expect(screen.getByText('+27 82 000 0000')).toBeInTheDocument();
    expect(screen.getByText('Cape Town, South Africa')).toBeInTheDocument();
  });

  it('renders the profile photo with correct alt text', () => {
    render(<ProfileCard profile={profile} />);
    const img = screen.getByAltText('Amara Osei profile');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('uses a generated avatar URL when photo_url is not provided', () => {
    const profileNoPhoto = { ...profile, photo_url: null };
    render(<ProfileCard profile={profileNoPhoto} />);
    const img = screen.getByAltText('Amara Osei profile');
    expect(img.src).toContain('ui-avatars.com');
  });

  it('renders nothing when profile is null', () => {
    const { container } = render(<ProfileCard profile={null} />);
    expect(container.firstChild).toBeNull();
  });
});
