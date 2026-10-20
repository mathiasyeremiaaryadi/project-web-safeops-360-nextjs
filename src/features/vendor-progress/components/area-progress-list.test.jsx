import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AreaProgressList } from '@/features/vendor-progress/components/area-progress-list';

/** @type {import('@/features/vendor-progress/lib/progress').AreaProgress} */
const area = {
  key: 'a1',
  name: 'Ash Handling System',
  points: 1,
  workers: 2,
  total: 3,
  completed: 1,
  inProgress: 1,
  notStarted: 1,
  percent: 33,
  shifts: ['DAY', 'NIGHT'],
  pointList: [
    {
      key: 'pi1',
      name: 'Ash Conveyor',
      workers: 2,
      assignments: 3,
      tasks: [
        {
          key: 'as1|DAY|',
          shift: 'DAY',
          status: 'COMPLETED',
          openDate: null,
          closeDate: null,
          workerName: 'Andi Pratama',
          notes: 'Area bersih',
          category: null,
        },
        {
          key: 'as2|NIGHT|',
          shift: 'NIGHT',
          status: 'IN_PROGRESS',
          openDate: null,
          closeDate: null,
          workerName: 'Fikri Hidayat',
          notes: 'Masih dikerjakan',
          category: null,
        },
      ],
      pending: [{ key: 'as3', workerName: 'Galih Saputra' }],
    },
  ],
};

describe('AreaProgressList', () => {
  it('lists points with their status and opens reports per selected shift', async () => {
    const user = userEvent.setup();

    render(<AreaProgressList areas={[area]} />);

    // Buka detail area.
    await user.click(screen.getByText('Ash Handling System'));

    // Header mengikuti tabel yang digunakan komponen saat ini.
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Point', 'Total task', 'Status laporan']);

    // Tab utama tetap tersedia sebelum detail point dibuka.
    expect(screen.getByRole('tab', { name: /Task/ })).toBeTruthy();

    expect(screen.getByRole('tab', { name: /Insiden/ })).toBeTruthy();

    expect(screen.getByRole('tab', { name: /Unassignment/ })).toBeTruthy();

    // Tab shift belum muncul sebelum point dibuka.
    expect(screen.queryByRole('tab', { name: /Pagi/ })).toBeNull();

    // Buka detail point.
    await user.click(screen.getByRole('button', { name: 'Ash Conveyor' }));

    const shiftTabList = screen.getByRole('tablist', {
      name: 'Shift di point Ash Conveyor',
    });

    const shiftTabs = within(shiftTabList)
      .getAllByRole('tab')
      .map((tab) => tab.textContent);

    expect(shiftTabs).toEqual(['Pagi(1)', 'Sore', 'Malam(1)']);

    // Shift pertama yang memiliki laporan dipilih secara otomatis.
    expect(screen.getByText('Area bersih')).toBeTruthy();
    expect(screen.queryByText('Masih dikerjakan')).toBeNull();

    // Memilih shift malam menampilkan laporan malam.
    await user.click(within(shiftTabList).getByRole('tab', { name: /Malam/ }));

    expect(screen.getByText('Masih dikerjakan')).toBeTruthy();

    // Shift sore tidak memiliki laporan.
    await user.click(within(shiftTabList).getByRole('tab', { name: 'Sore' }));

    expect(screen.getByText('Belum ada laporan di shift Sore.')).toBeTruthy();

    // Penugasan yang belum dikerjakan tetap ditampilkan.
    expect(
      screen.getByRole('heading', {
        name: 'Penugasan belum dikerjakan',
      }),
    ).toBeTruthy();

    expect(screen.getByText('Galih Saputra')).toBeTruthy();
  });
});
