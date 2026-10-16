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
  it('lists points with their status only, and a point opens its reports per chosen shift', async () => {
    const user = userEvent.setup();
    render(<AreaProgressList areas={[area]} />);
    await user.click(screen.getByText('Ash Handling System'));

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Titik', 'Status']);
    expect(screen.queryByRole('tab')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ash Conveyor' }));
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual(['Pagi(1)', 'Sore', 'Malam(1)']);
    // The first shift with reports is chosen.
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Area bersih')).toBeTruthy();
    expect(within(panel).queryByText('Masih dikerjakan')).toBeNull();

    await user.click(screen.getByRole('tab', { name: /Malam/ }));
    expect(within(screen.getByRole('tabpanel')).getByText('Masih dikerjakan')).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'Sore' }));
    expect(screen.getByText('Belum ada laporan di shift Sore.')).toBeTruthy();

    // Assignments not yet worked stay visible under the shifts.
    expect(screen.getByRole('heading', { name: 'Belum dikerjakan' })).toBeTruthy();
  });
});
