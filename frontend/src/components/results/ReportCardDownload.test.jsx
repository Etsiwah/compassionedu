import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the api module
jest.mock('../../utils/api', () => ({
  get: jest.fn(),
}));
import api from '../../utils/api';

import ReportCardDownload from './ReportCardDownload';

describe('ReportCardDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Stub URL.createObjectURL and URL.revokeObjectURL (not available in jsdom)
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('renders nothing when term is not provided', () => {
    const { container } = render(<ReportCardDownload studentId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when term is an empty string', () => {
    const { container } = render(<ReportCardDownload studentId={1} term="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the download button when term is provided', () => {
    render(<ReportCardDownload studentId={1} term="Term 1" />);
    expect(screen.getByRole('button', { name: /Download Report Card/i })).toBeInTheDocument();
  });

  it('calls the correct API endpoint when the button is clicked', async () => {
    api.get.mockResolvedValueOnce({ data: new Blob(['%PDF'], { type: 'application/pdf' }) });
    render(<ReportCardDownload studentId={5} term="Term 2" />);
    fireEvent.click(screen.getByRole('button', { name: /Download Report Card/i }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/results/5/report-card/Term%202',
        expect.objectContaining({ responseType: 'blob' })
      );
    });
  });

  it('creates and revokes an object URL after a successful download', async () => {
    api.get.mockResolvedValueOnce({ data: new Blob(['%PDF'], { type: 'application/pdf' }) });
    // Spy on document.createElement to intercept the anchor click
    const clickSpy = jest.fn();
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreate(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    render(<ReportCardDownload studentId={1} term="Term 1" />);
    fireEvent.click(screen.getByRole('button', { name: /Download Report Card/i }));

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    document.createElement.mockRestore();
  });

  it('shows an alert when the API call fails', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ReportCardDownload studentId={1} term="Term 1" />);
    fireEvent.click(screen.getByRole('button', { name: /Download Report Card/i }));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to download report card.');
    });
    alertSpy.mockRestore();
  });
});
