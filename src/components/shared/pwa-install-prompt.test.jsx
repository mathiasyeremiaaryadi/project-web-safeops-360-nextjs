import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PwaInstallPrompt } from '@/components/shared/pwa-install-prompt';

vi.mock('@/components/shared/app-logo', () => ({ AppLogo: () => null }));

describe('PwaInstallPrompt', () => {
  it('always offers "Pasang aplikasi", and shows the steps when the browser has no dialog', async () => {
    const user = userEvent.setup();
    render(<PwaInstallPrompt />);

    await user.click(screen.getByRole('button', { name: 'Pasang aplikasi' }));
    expect(screen.getByRole('dialog', { name: 'Pasang SafeOps 360' })).toBeTruthy();
    expect(screen.getByText('Buka halaman ini di Chrome atau Edge.')).toBeTruthy();
  });
});
