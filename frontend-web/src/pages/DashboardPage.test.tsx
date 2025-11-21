import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { api } from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard with analytics data', async () => {
    const mockDashboardData = {
      members: {
        totalMembers: 1000,
        activeMembers: 950,
        newMembersLast30Days: 25,
      },
      events: {
        totalEvents: 150,
        upcomingEvents: 25,
        pastEvents: 100,
      },
      engagement: {
        totalPosts: 200,
        totalComments: 500,
        engagementScore: 85,
      },
      revenue: {
        totalRevenue: 50000,
      },
    };

    (api.get as any).mockResolvedValue({ data: { data: mockDashboardData } });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/1000/)).toBeInTheDocument();
      expect(screen.getByText(/950/)).toBeInTheDocument();
      expect(screen.getByText(/25/)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    (api.get as any).mockImplementation(() => new Promise(() => {}));

    render(<DashboardPage />);

    expect(screen.getByText(/loading|laden/i)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (api.get as any).mockRejectedValue(new Error('API Error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/error|fehler/i)).toBeInTheDocument();
    });
  });
});
