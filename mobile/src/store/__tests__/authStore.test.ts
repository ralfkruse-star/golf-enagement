import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../authStore';

describe('Auth Store', () => {
  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  // Additional tests would require mocking the API service
});
