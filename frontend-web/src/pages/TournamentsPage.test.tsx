import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import TournamentsPage from './TournamentsPage';
import { tournamentApi } from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  tournamentApi: {
    getActiveTournaments: vi.fn(),
    getLeaderboard: vi.fn(),
    submitScore: vi.fn(),
    getMyScore: vi.fn(),
  },
}));

describe('TournamentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(tournamentApi.getActiveTournaments).mockResolvedValue([]);
    vi.mocked(tournamentApi.getLeaderboard).mockResolvedValue([]);
  });

  it('renders page header correctly', () => {
    render(<TournamentsPage />);

    expect(screen.getByRole('heading', { name: /turniere/i })).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(<TournamentsPage />);

    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  it('calls getActiveTournaments API on mount', () => {
    render(<TournamentsPage />);

    expect(tournamentApi.getActiveTournaments).toHaveBeenCalled();
  });
});
