import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MembersPage from './MembersPage';
import { api } from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render members list', async () => {
    const mockMembers = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        membershipType: 'FULL',
        membershipStatus: 'ACTIVE',
        membershipNumber: 'GCS-000001',
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        membershipType: 'JUNIOR',
        membershipStatus: 'ACTIVE',
        membershipNumber: 'GCS-000002',
      },
    ];

    (api.get as any).mockResolvedValue({ data: { data: mockMembers } });

    render(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should show statistics', async () => {
    const mockMembers = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      firstName: `Member${i}`,
      lastName: 'Test',
      email: `member${i}@example.com`,
      membershipType: 'FULL',
      membershipStatus: 'ACTIVE',
      membershipNumber: `GCS-${String(i).padStart(6, '0')}`,
    }));

    const mockStats = {
      totalMembers: 100,
      activeMembers: 95,
      inactiveMembers: 5,
    };

    (api.get as any)
      .mockResolvedValueOnce({ data: { data: mockMembers } })
      .mockResolvedValueOnce({ data: { data: mockStats } });

    render(<MembersPage />);

    await waitFor(() => {
      // Check if any numbers are displayed (statistics)
      expect(screen.getByText(/100|95|5/)).toBeInTheDocument();
    });
  });

  it('should handle empty members list', async () => {
    (api.get as any).mockResolvedValue({ data: { data: [] } });

    render(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText(/keine.*mitglieder|no.*members/i)).toBeInTheDocument();
    });
  });
});
