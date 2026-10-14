import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { cookieJar, GO_ORIGIN, goBackend, loginInJar, server } from '../../../../tests/unit/msw.js';
import { createRouterMock, renderWithProviders } from '../../../../tests/unit/test-utils';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { useSessionStore } from '@/features/auth/stores/session-store';
import { setupAuthClient } from '@/features/auth/lib/setup-auth-client';

const router = vi.hoisted(() => ({ current: /** @type {any} */ (null) }));
vi.mock('next/navigation', () => ({
  useRouter: () => router.current,
  usePathname: () => '/change-password',
}));

const AGUS = {
  id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
  username: 'agus.pratama',
  full_name: 'Agus Pratama',
  roles: /** @type {const} */ (['WORKER']),
  must_change_password: true,
  scopes: { site_ids: [], vendor_ids: [] },
};

/**
 * Signs agus.pratama in through the BFF (session cookie in the bridge jar) and renders the form.
 * @param {{ mustChange?: boolean }} [options]
 */
async function renderForm({ mustChange = true } = {}) {
  await loginInJar('agus.pratama', 'Kp7mw2Rq');
  useSessionStore.setState({
    user: { ...AGUS, must_change_password: mustChange },
    status: 'authenticated',
  });
  const user = userEvent.setup();
  renderWithProviders(<ChangePasswordForm />);
  return {
    user,
    current: screen.getByLabelText(mustChange ? 'Password sementara' : 'Password saat ini'),
    next: screen.getByLabelText('Password baru'),
    confirm: screen.getByLabelText('Ulangi password baru'),
    submit: screen.getByRole('button', { name: 'Simpan dan lanjutkan' }),
  };
}

/** @param {string} label */
function ruleItem(label) {
  const list = screen.getByRole('list', { name: 'Aturan password' });
  return within(list).getByText(label).closest('li');
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    router.current = createRouterMock();
    setupAuthClient({ onSessionExpired: () => useSessionStore.getState().clear() });
  });

  it('shows the mandatory-change copy with the username', async () => {
    await renderForm();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Buat password baru' }),
    ).toBeInTheDocument();
    expect(screen.getByText('agus.pratama')).toHaveClass('font-mono');
    expect(screen.getByText(/password Anda masih sementara dari admin/)).toBeInTheDocument();
  });

  it('shows the voluntary-change copy', async () => {
    await renderForm({ mustChange: false });
    expect(
      screen.getByText('Gunakan password yang belum pernah Anda pakai di aplikasi lain.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Password saat ini')).toBeInTheDocument();
  });

  it('updates the rule checklist live while typing', async () => {
    const { user, next, confirm } = await renderForm();
    for (const label of [
      'Minimal 8 karakter',
      'Mengandung huruf',
      'Mengandung angka',
      'Password baru cocok',
    ]) {
      expect(ruleItem(label)).toHaveAttribute('data-met', 'false');
    }

    await user.type(next, 'abc');
    expect(ruleItem('Mengandung huruf')).toHaveAttribute('data-met', 'true');
    expect(ruleItem('Minimal 8 karakter')).toHaveAttribute('data-met', 'false');

    await user.type(next, 'defgh');
    expect(ruleItem('Minimal 8 karakter')).toHaveAttribute('data-met', 'true');
    expect(ruleItem('Mengandung angka')).toHaveAttribute('data-met', 'false');

    await user.type(next, '1');
    expect(ruleItem('Mengandung angka')).toHaveAttribute('data-met', 'true');

    await user.type(confirm, 'abcdefgh1');
    expect(ruleItem('Password baru cocok')).toHaveAttribute('data-met', 'true');
    expect(ruleItem('Password baru cocok')).toHaveClass('text-success');
  });

  it('keeps the button disabled until every rule is met', async () => {
    const { user, current, next, confirm, submit } = await renderForm();
    expect(submit).toBeDisabled();
    await user.type(current, 'Kp7mw2Rq');
    await user.type(next, 'barubaru1');
    expect(submit).toBeDisabled();
    await user.type(confirm, 'barubaru2');
    expect(submit).toBeDisabled();
    expect(ruleItem('Password baru cocok')).toHaveAttribute('data-met', 'false');

    await user.clear(confirm);
    await user.type(confirm, 'barubaru1');
    expect(submit).toBeEnabled();
  });

  it('shows "Password baru tidak cocok" after leaving a mismatching confirmation', async () => {
    const { user, current, next, confirm } = await renderForm();
    await user.type(current, 'Kp7mw2Rq');
    await user.type(next, 'barubaru1');
    await user.type(confirm, 'barubaru2');
    await user.tab();
    expect(await screen.findByText('Password baru tidak cocok')).toBeInTheDocument();
    expect(confirm).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a new password equal to the current one', async () => {
    const { user, current, next, confirm, submit } = await renderForm();
    await user.type(current, 'sama12345');
    await user.type(next, 'sama12345');
    await user.type(confirm, 'sama12345');
    await user.click(submit);

    expect(
      await screen.findByText('Password baru harus berbeda dari password lama'),
    ).toBeInTheDocument();
    expect(next).toHaveFocus();
  });

  it('shows "Password saat ini salah." on the first field when the server rejects it', async () => {
    const { user, current, next, confirm, submit } = await renderForm();
    await user.type(current, 'salah1234');
    await user.type(next, 'barubaru1');
    await user.type(confirm, 'barubaru1');
    await user.click(submit);

    expect(await screen.findByText('Password saat ini salah.')).toBeInTheDocument();
    expect(current).toHaveAttribute('aria-invalid', 'true');
    expect(current).toHaveFocus();
  });

  it('shows a server validation message below the form', async () => {
    server.use(
      http.put(`${GO_ORIGIN}/api/v1/auth/password`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Password terlalu umum.' } },
          { status: 400 },
        ),
      ),
    );
    const { user, current, next, confirm, submit } = await renderForm();
    await user.type(current, 'Kp7mw2Rq');
    await user.type(next, 'barubaru1');
    await user.type(confirm, 'barubaru1');
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent('Password terlalu umum.');
  });

  it('on success clears the session, redirects to /login and shows a toast', async () => {
    const { user, current, next, confirm, submit } = await renderForm();
    await user.type(current, 'Kp7mw2Rq');
    await user.type(next, 'barubaru1');
    await user.type(confirm, 'barubaru1');
    await user.click(submit);

    await waitFor(() => expect(router.current.replace).toHaveBeenCalledWith('/login'));
    expect(useSessionStore.getState()).toMatchObject({
      user: null,
      status: 'unauthenticated',
    });
    expect(
      await screen.findByText('Password berhasil diganti. Silakan masuk dengan password baru.'),
    ).toBeInTheDocument();
    // FR-12: every Go session is revoked and the BFF cleared the session cookie.
    expect(goBackend.stats().activeSessions).toBe(0);
    expect(cookieJar.size).toBe(0);
  });

  it('shows "Menyimpan…" and disables the button while saving', async () => {
    server.use(
      http.put(`${GO_ORIGIN}/api/v1/auth/password`, async () => {
        await delay(200);
        return undefined; // then let the mock Go backend answer
      }),
    );
    const { user, current, next, confirm, submit } = await renderForm();
    await user.type(current, 'Kp7mw2Rq');
    await user.type(next, 'barubaru1');
    await user.type(confirm, 'barubaru1');
    await user.click(submit);
    expect(await screen.findByRole('button', { name: /Menyimpan…/ })).toBeDisabled();
  });
});
