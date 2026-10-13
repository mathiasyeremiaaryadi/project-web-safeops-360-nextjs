import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { createMockSession } from '@/mocks/handlers/auth';
import { createRouterMock, renderWithProviders } from '../../../../tests/unit/test-utils';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { setupAuthClient } from '@/features/auth/lib/setup-auth-client';

const nav = vi.hoisted(() => ({ router: /** @type {any} */ (null), pathname: '/' }));
vi.mock('next/navigation', () => ({
  useRouter: () => nav.router,
  usePathname: () => nav.pathname,
}));

function renderGate() {
  return renderWithProviders(
    <AuthGate>
      <p>Konten terlindungi</p>
    </AuthGate>,
  );
}

describe('AuthGate', () => {
  beforeEach(() => {
    nav.router = createRouterMock();
    nav.pathname = '/';
    window.history.replaceState(null, '', '/');
    useSessionStore.setState({ accessToken: null, user: null, status: 'idle' });
    setupAuthClient({ onSessionExpired: () => useSessionStore.getState().clear() });
  });

  it('shows a skeleton, restores the session from the refresh cookie and renders children', async () => {
    createMockSession('budi.santoso'); // a valid refresh "cookie" exists
    renderGate();
    expect(screen.getByTestId('session-skeleton')).toBeInTheDocument();
    expect(await screen.findByText('Konten terlindungi')).toBeInTheDocument();
    expect(useSessionStore.getState().user?.username).toBe('budi.santoso');
  });

  it('redirects to /login?next=… when the session cannot be restored', async () => {
    nav.pathname = '/change-password';
    window.history.replaceState(null, '', '/change-password');
    renderGate();
    await waitFor(() =>
      expect(nav.router.replace).toHaveBeenCalledWith('/login?next=%2Fchange-password'),
    );
    expect(screen.queryByText('Konten terlindungi')).not.toBeInTheDocument();
  });

  it('fails closed when /auth/me errors', async () => {
    createMockSession('budi.santoso');
    server.use(http.get('*/api/v1/auth/me', () => HttpResponse.json({}, { status: 500 })));
    renderGate();
    // 5xx on GET is retried (ky + TanStack Query) before failing closed.
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledWith('/login'), {
      timeout: 5000,
    });
    expect(screen.queryByText('Konten terlindungi')).not.toBeInTheDocument();
    expect(useSessionStore.getState().status).toBe('unauthenticated');
  });

  it('forces /change-password when must_change_password is true', async () => {
    createMockSession('agus.pratama');
    renderGate();
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledWith('/change-password'));
    expect(screen.queryByText('Konten terlindungi')).not.toBeInTheDocument();
  });

  it('renders /change-password for a user who must change the password', async () => {
    nav.pathname = '/change-password';
    createMockSession('agus.pratama');
    renderGate();
    expect(await screen.findByText('Konten terlindungi')).toBeInTheDocument();
    expect(nav.router.replace).not.toHaveBeenCalled();
  });
});
