import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectsGallery from './ProjectsGallery';

describe('ProjectsGallery', () => {
  const imageMedia = [
    { id: 1, url: 'https://example.com/img1.jpg', mime_type: 'image/jpeg', title: 'My Project' },
    { id: 2, url: 'https://example.com/img2.png', mime_type: 'image/png', title: null },
    { id: 3, url: 'https://example.com/img3.webp', mime_type: 'image/webp', title: 'Webp Image' },
  ];

  const videoMedia = [
    { id: 4, url: 'https://example.com/vid.mp4', mime_type: 'video/mp4', title: 'Demo Video' },
  ];

  it('shows empty state message when no media is provided', () => {
    render(<ProjectsGallery media={[]} />);
    expect(screen.getByText('No project media uploaded yet.')).toBeInTheDocument();
  });

  it('shows empty state message when media prop is omitted', () => {
    render(<ProjectsGallery />);
    expect(screen.getByText('No project media uploaded yet.')).toBeInTheDocument();
  });

  it('renders an img element for JPEG media', () => {
    render(<ProjectsGallery media={[imageMedia[0]]} />);
    const img = screen.getByAltText('My Project');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img1.jpg');
  });

  it('renders an img element for PNG media', () => {
    render(<ProjectsGallery media={[imageMedia[1]]} />);
    // No title — falls back to "Project media"
    const img = screen.getByAltText('Project media');
    expect(img).toBeInTheDocument();
  });

  it('renders an img element for WEBP media', () => {
    render(<ProjectsGallery media={[imageMedia[2]]} />);
    const img = screen.getByAltText('Webp Image');
    expect(img).toBeInTheDocument();
  });

  it('renders a video placeholder (🎬) for non-image MIME types', () => {
    render(<ProjectsGallery media={videoMedia} />);
    expect(screen.getByText('🎬')).toBeInTheDocument();
  });

  it('renders the title caption when title is provided', () => {
    render(<ProjectsGallery media={imageMedia} />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('Webp Image')).toBeInTheDocument();
  });

  it('does not render a caption when title is null', () => {
    render(<ProjectsGallery media={[imageMedia[1]]} />);
    // imageMedia[1] has title: null — no caption paragraph should appear
    const captions = screen.queryAllByText(/./);
    // The only text should be from the img alt, not a visible caption
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('renders all media items', () => {
    const allMedia = [...imageMedia, ...videoMedia];
    render(<ProjectsGallery media={allMedia} />);
    // 3 images + 1 video placeholder
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(3);
    expect(screen.getByText('🎬')).toBeInTheDocument();
  });

  it('renders a GIF as an image', () => {
    const gifMedia = [{ id: 5, url: 'https://example.com/anim.gif', mime_type: 'image/gif', title: 'Animation' }];
    render(<ProjectsGallery media={gifMedia} />);
    const img = screen.getByAltText('Animation');
    expect(img).toBeInTheDocument();
  });
});
