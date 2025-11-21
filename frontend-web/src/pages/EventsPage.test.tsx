import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventsPage from './EventsPage';
import { api } from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const MockEventsPage = () => (
  <BrowserRouter>
    <EventsPage />
  </BrowserRouter>
);

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render events list', async () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Golf Tournament',
        type: 'TOURNAMENT',
        startDate: '2025-06-01T10:00:00Z',
        endDate: '2025-06-01T18:00:00Z',
        maxParticipants: 20,
        currentParticipants: 15,
        isPublished: true,
      },
      {
        id: '2',
        title: 'Training Session',
        type: 'TRAINING',
        startDate: '2025-06-05T14:00:00Z',
        endDate: '2025-06-05T16:00:00Z',
        maxParticipants: 10,
        currentParticipants: 8,
        isPublished: true,
      },
    ];

    (api.get as any).mockResolvedValue({ data: { data: mockEvents } });

    render(<MockEventsPage />);

    await waitFor(() => {
      expect(screen.getByText('Golf Tournament')).toBeInTheDocument();
      expect(screen.getByText('Training Session')).toBeInTheDocument();
    });
  });

  it('should show empty state when no events', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [] } });

    render(<MockEventsPage />);

    await waitFor(() => {
      expect(screen.getByText(/keine.*events|no.*events/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    (api.get as any).mockRejectedValue(new Error('Failed to load events'));

    render(<MockEventsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error|fehler/i)).toBeInTheDocument();
    });
  });
});
