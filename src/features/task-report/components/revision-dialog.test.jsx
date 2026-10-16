import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevisionDialog } from '@/features/task-report/components/revision-dialog';

const mutate = vi.fn();
vi.mock('@/features/task-report/api/mutations', () => ({
  useReviseReport: () => ({ mutate, reset: vi.fn(), isPending: false }),
}));
vi.mock('@/components/shared/blob-image', () => ({ BlobImage: () => <span>foto</span> }));

const photo = (name) => new File(['x'], name, { type: 'image/jpeg' });

describe('RevisionDialog', () => {
  it('needs new before and after photos, then sends them with the reason', async () => {
    const user = userEvent.setup();
    render(<RevisionDialog reportId="r1" open onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Kirim revisi' }));
    expect(screen.getByText('Ambil foto sebelum dan sesudah yang baru.')).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();

    await user.upload(screen.getByLabelText('Ambil foto sebelum'), photo('before.jpg'));
    await user.upload(screen.getByLabelText('Ambil foto sesudah'), photo('after.jpg'));
    await user.type(screen.getByLabelText('Alasan revisi (opsional)'), 'Foto buram');
    await user.click(screen.getByRole('button', { name: 'Kirim revisi' }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const [input] = mutate.mock.calls[0];
    expect(input.before.file.name).toBe('before.jpg');
    expect(input.after.file.name).toBe('after.jpg');
    expect(input.before.takenAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(input.reason).toBe('Foto buram');
  });
});
