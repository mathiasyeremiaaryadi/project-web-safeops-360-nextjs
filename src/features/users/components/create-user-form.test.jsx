import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { goBackend, loginInJar } from '../../../../tests/unit/msw.js';
import { createRouterMock, renderWithProviders } from '../../../../tests/unit/test-utils';
import { CreateUserForm } from '@/features/users/components/create-user-form';

const router = vi.hoisted(() => ({ current: /** @type {any} */ (null) }));
vi.mock('next/navigation', () => ({
  useRouter: () => router.current,
  usePathname: () => '/users/new',
}));

async function renderForm() {
  await loginInJar('superadmin', 'Admin12345');
  const user = userEvent.setup();
  renderWithProviders(<CreateUserForm />);
  return { user };
}

describe('CreateUserForm', () => {
  beforeEach(() => {
    router.current = createRouterMock();
  });

  it('enforces FR-18: a Worker needs exactly one vendor', async () => {
    const { user } = await renderForm();
    await user.type(screen.getByLabelText('Nama lengkap'), 'Joko Susilo');
    await user.type(screen.getByLabelText('Username'), 'joko.susilo');
    await user.click(screen.getByLabelText(/^Worker/));
    await user.click(screen.getByRole('button', { name: 'Simpan user' }));

    expect(
      await screen.findByText('Admin Worker dan Worker wajib tepat satu vendor.'),
    ).toBeInTheDocument();
    expect(goBackend.db().users.some((u) => u.username === 'joko.susilo')).toBe(false);
  });

  it('creates a Worker with a vendor and shows the temporary password once', async () => {
    const { user } = await renderForm();
    await user.type(screen.getByLabelText('Nama lengkap'), 'Joko Susilo');
    await user.type(screen.getByLabelText('Username'), 'Joko.Susilo');
    await user.click(screen.getByLabelText(/^Worker/));

    await user.click(screen.getByRole('combobox', { name: /Vendor/ }));
    await user.click(await screen.findByRole('option', { name: /PT Karya Aman/ }));
    expect(screen.getByRole('combobox', { name: /Vendor/ })).toHaveTextContent('PT Karya Aman');

    await user.click(screen.getByRole('button', { name: 'Simpan user' }));

    const dialog = await screen.findByRole('dialog', { name: 'Password sementara' });
    expect(within(dialog).getByText('Password ini hanya ditampilkan sekali.')).toBeInTheDocument();
    const created = goBackend.db().users.find((u) => u.username === 'joko.susilo');
    expect(created).toMatchObject({ roles: ['WORKER'], must_change_password: true });
    expect(created?.scopes.vendor_ids).toHaveLength(1);
    expect(within(dialog).getByLabelText('Password sementara')).toHaveTextContent(
      created?.password ?? '',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Selesai' }));
    await waitFor(() => expect(router.current.push).toHaveBeenCalledWith(`/users/${created?.id}`));
  });

  it('shows "Username sudah dipakai." on 409', async () => {
    const { user } = await renderForm();
    await user.type(screen.getByLabelText('Nama lengkap'), 'Budi Lain');
    await user.type(screen.getByLabelText('Username'), 'budi.santoso');
    await user.click(screen.getByLabelText(/^Super Admin/));
    await user.click(screen.getByRole('button', { name: 'Simpan user' }));
    expect(await screen.findByText('Username sudah dipakai.')).toBeInTheDocument();
  });
});
