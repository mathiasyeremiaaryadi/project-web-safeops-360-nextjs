import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { APP_ORIGIN, cookieJar, GO_ORIGIN, server } from '../../../../tests/unit/msw.js';
import { createRouterMock, renderWithProviders } from '../../../../tests/unit/test-utils';
import { LoginForm } from '@/features/auth/components/login-form';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { setupAuthClient } from '@/features/auth/lib/setup-auth-client';

const router = vi.hoisted(() => ({ current: /** @type {any} */ (null) }));
vi.mock('next/navigation', () => ({
  useRouter: () => router.current,
  usePathname: () => '/login',
}));

/** @param {Partial<{ next: string }>} [props] */
function renderLogin(props = {}) {
  const user = userEvent.setup();
  renderWithProviders(<LoginForm {...props} />);
  return {
    user,
    username: screen.getByLabelText('Username'),
    password: screen.getByLabelText('Password'),
    submit: screen.getByRole('button', { name: 'Masuk' }),
  };
}

describe('LoginForm', () => {
  beforeEach(() => {
    router.current = createRouterMock();
    useSessionStore.setState({ user: null, status: 'unauthenticated' });
    setupAuthClient({ onSessionExpired: () => useSessionStore.getState().clear() });
  });

  it('requires username and password', async () => {
    const { user, submit, username } = renderLogin();
    await user.click(submit);

    expect(await screen.findByText('Username wajib diisi')).toBeInTheDocument();
    expect(screen.getByText('Password wajib diisi')).toBeInTheDocument();
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(username).toHaveAttribute('aria-describedby', 'username-error');
    expect(username).toHaveFocus();
  });

  it('logs in, lowercases the username and redirects to a safe next path', async () => {
    let sentUsername;
    // What the BFF forwards to Go.
    server.events.on('request:start', async ({ request }) => {
      if (request.url === `${GO_ORIGIN}/api/v1/auth/login`)
        sentUsername = (await request.clone().json()).username;
    });
    const { user, username, password, submit } = renderLogin({ next: '/tasks?site=1' });
    await user.type(username, '  Budi.Santoso ');
    await user.type(password, 'rahasia123');
    await user.click(submit);

    await waitFor(() => expect(router.current.replace).toHaveBeenCalledWith('/tasks?site=1'));
    expect(sentUsername).toBe('budi.santoso');
    expect(useSessionStore.getState().user?.username).toBe('budi.santoso');
    // The session lives in the (HttpOnly) BFF cookie, not in JS state.
    expect([...cookieJar.keys()]).toEqual(['safeops_session']);
    expect(JSON.stringify(useSessionStore.getState())).not.toMatch(/go-(access|refresh)/);
    server.events.removeAllListeners();
  });

  it('ignores an unsafe next parameter', async () => {
    const { user, username, password, submit } = renderLogin({ next: '//evil.com' });
    await user.type(username, 'budi.santoso');
    await user.type(password, 'rahasia123');
    await user.click(submit);
    await waitFor(() => expect(router.current.replace).toHaveBeenCalledWith('/'));
  });

  it('redirects to /change-password when the password must be changed', async () => {
    const { user, username, password, submit } = renderLogin({ next: '/tasks' });
    await user.type(username, 'agus.pratama');
    await user.type(password, 'Kp7mw2Rq');
    await user.click(submit);

    await waitFor(() => expect(router.current.replace).toHaveBeenCalledWith('/change-password'));
  });

  it.each([
    ['budi.santoso', 'salah-password', 'Username atau password salah.'],
    ['tidak.ada', 'apapun123', 'Username atau password salah.'],
    [
      'dewi.lestari',
      'apapun123',
      'Akun Anda dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
    ],
    ['rate.limited', 'apapun123', 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.'],
    ['user.nonaktif', 'apapun123', 'Akun Anda tidak aktif. Hubungi admin.'],
    // Go unreachable from the BFF (502) is a server problem, not the user's connection.
    ['network.error', 'apapun123', 'Terjadi gangguan pada server. Coba beberapa saat lagi.'],
    ['server.error', 'apapun123', 'Terjadi gangguan pada server. Coba beberapa saat lagi.'],
  ])('shows the message for %s, clears and focuses the password', async (name, pwd, message) => {
    const { user, username, password, submit } = renderLogin();
    await user.type(username, name);
    await user.type(password, pwd);
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(password).toHaveValue('');
    expect(password).toHaveFocus();
    expect(username).toHaveValue(name);
    expect(router.current.replace).not.toHaveBeenCalled();
  });

  it('shows the connection message when the browser cannot reach the server', async () => {
    server.use(http.post(`${APP_ORIGIN}/api/auth/login`, () => HttpResponse.error()));
    const { user, username, password, submit } = renderLogin();
    await user.type(username, 'budi.santoso');
    await user.type(password, 'rahasia123');
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    );
  });

  it('disables the button and shows progress while submitting', async () => {
    server.use(
      http.post(`${GO_ORIGIN}/api/v1/auth/login`, async () => {
        await delay(200);
        return HttpResponse.json(
          { error: { code: 'AUTH_INVALID_CREDENTIALS', message: '' } },
          { status: 401 },
        );
      }),
    );
    const { user, username, password, submit } = renderLogin();
    await user.type(username, 'budi.santoso');
    await user.type(password, 'rahasia123');
    await user.click(submit);

    const busyButton = await screen.findByRole('button', { name: /Memproses…/ });
    expect(busyButton).toBeDisabled();
    await user.click(busyButton);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled();
  });

  it('toggles password visibility', async () => {
    const { user, password } = renderLogin();
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Tampilkan password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Sembunyikan password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('never exposes Go tokens to the browser (storage, JS cookies, state)', async () => {
    const { user, username, password, submit } = renderLogin();
    await user.type(username, 'budi.santoso');
    await user.type(password, 'rahasia123');
    await user.click(submit);
    await waitFor(() => expect(router.current.replace).toHaveBeenCalled());

    const visible = JSON.stringify({
      local: { ...window.localStorage },
      session: { ...window.sessionStorage },
      cookie: document.cookie,
      state: useSessionStore.getState(),
    });
    expect(visible).not.toMatch(/go-(access|refresh)/);
  });
});
