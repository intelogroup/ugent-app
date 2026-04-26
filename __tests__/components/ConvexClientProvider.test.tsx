import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';

const { mockUseAuth, mockUseAccessToken, mockConvexProviderWithAuth, latestBridgeState } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseAccessToken: vi.fn(),
  latestBridgeState: {
    current: null as
      | null
      | {
          isLoading: boolean;
          isAuthenticated: boolean;
          fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
        },
  },
  mockConvexProviderWithAuth: vi.fn(
    ({ children, useAuth }: { children: React.ReactNode; useAuth: () => {
      isLoading: boolean;
      isAuthenticated: boolean;
      fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
    } }) => {
      latestBridgeState.current = useAuth();
      return <div data-testid="convex-provider">{children}</div>;
    }
  ),
}));

vi.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: mockUseAuth,
  useAccessToken: mockUseAccessToken,
}));

vi.mock('convex/react', () => ({
  ConvexReactClient: vi.fn(function MockConvexReactClient(this: object) {
    return this;
  }),
  ConvexProviderWithAuth: mockConvexProviderWithAuth,
}));

describe('ConvexClientProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user_01' },
      loading: false,
    });
    mockUseAccessToken.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token_123'),
      refresh: vi.fn().mockResolvedValue('token_456'),
      loading: false,
    });
  });

  it('wraps children in ConvexProviderWithAuth', () => {
    render(
      <ConvexClientProvider>
        <div>child</div>
      </ConvexClientProvider>
    );

    expect(screen.getByTestId('convex-provider')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(mockConvexProviderWithAuth).toHaveBeenCalled();
  });

  it('bridges WorkOS auth state into Convex auth state', async () => {
    render(
      <ConvexClientProvider>
        <div>child</div>
      </ConvexClientProvider>
    );

    const auth = latestBridgeState.current;

    expect(auth).not.toBeNull();
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isLoading).toBe(false);
    await expect(auth.fetchAccessToken({ forceRefreshToken: false })).resolves.toBe('token_123');
    await expect(auth.fetchAccessToken({ forceRefreshToken: true })).resolves.toBe('token_456');
  });
});
