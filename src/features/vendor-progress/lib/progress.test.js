import { describe, expect, it } from 'vitest';
import {
  mergeVendorProgress,
  resolveProgressRange,
  toVendorProgress,
} from '@/features/vendor-progress/lib/progress';

/** The shape seen on the real backend (screenshot), with two areas. */
const day = (completed, inProgress, notStarted) => ({
  data: {
    filter: { site_id: 's1', vendor_id: 'v1', date: '2026-10-09' },
    task_summary: {},
    vendor_progress: [
      {
        vendor_id: 'v1',
        vendor_name: 'PT Cahaya Energi Nusantara',
        total_task: completed + inProgress + notStarted,
        completed,
        in_progress: inProgress,
        not_started: notStarted,
        progress_percentage: 92,
        vendor_progress_detail: {
          total_area: 2,
          area_detail: [
            { area_name: 'Turbine Hall', total_point: 30, total_task: 10, completed: 8 },
            { area_name: 'Boiler', total_point: 25, total_task: 5, completed: 4 },
          ],
          total_point: 55,
          total_worker: 10,
          total_assignment: 59,
        },
      },
    ],
  },
});

describe('toVendorProgress', () => {
  it('reads the vendor row and its detail', () => {
    const [row] = toVendorProgress(day(54, 3, 2));
    expect(row).toMatchObject({
      vendorId: 'v1',
      vendorName: 'PT Cahaya Energi Nusantara',
      total: 59,
      completed: 54,
      inProgress: 3,
      notStarted: 2,
      percent: 92,
      totals: { areas: 2, points: 55, workers: 10, assignments: 59 },
    });
    expect(row.areas.map((a) => [a.name, a.points, a.percent])).toEqual([
      ['Turbine Hall', 30, 80],
      ['Boiler', 25, 80],
    ]);
  });

  it('returns no rows for an unknown body', () => {
    expect(toVendorProgress(null)).toEqual([]);
    expect(toVendorProgress({ data: { vendor_progress: 'x' } })).toEqual([]);
  });
});

describe('mergeVendorProgress', () => {
  it('adds up the counts of several days and computes the percentage again', () => {
    const merged = mergeVendorProgress([
      toVendorProgress(day(5, 3, 2)),
      toVendorProgress(day(10, 0, 0)),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ total: 20, completed: 15, inProgress: 3, notStarted: 2 });
    expect(merged[0].percent).toBe(75);
    // The set-up is not added up.
    expect(merged[0].totals).toEqual({ areas: 2, points: 55, workers: 10, assignments: 59 });
    expect(merged[0].areas[0]).toMatchObject({ total: 20, completed: 16, percent: 80 });
  });
});

describe('resolveProgressRange', () => {
  const TODAY = '2026-10-15';

  it('defaults to today only', () => {
    expect(resolveProgressRange('', '', TODAY)).toEqual({
      from: TODAY,
      to: TODAY,
      dates: [TODAY],
      error: null,
    });
  });

  it('lists every day of the range, at most 31', () => {
    expect(resolveProgressRange('2026-10-13', TODAY, TODAY).dates).toEqual([
      '2026-10-13',
      '2026-10-14',
      TODAY,
    ]);
    expect(resolveProgressRange('2026-09-15', TODAY, TODAY).dates).toHaveLength(31);
    expect(resolveProgressRange('2026-09-14', TODAY, TODAY).error).toBe(
      'Rentang maksimal 31 hari.',
    );
    expect(resolveProgressRange('2026-10-16', '2026-10-15', TODAY).error).toBe(
      'Tanggal mulai harus sebelum tanggal akhir.',
    );
  });
});

describe('toVendorProgress — detail endpoint (Postman example)', () => {
  const detail = {
    data: {
      type: 'vendor_progress',
      data: {
        site_id: '',
        vendor_progress: [
          {
            vendor_id: 'f47',
            vendor_name: 'CV Sinergi Perkasa',
            total_task: 64,
            completed: 37,
            in_progress: 8,
            pending: 19,
            progress_percentage: 58,
            vendor_progress_detail: {
              total_area: 10,
              area_detail: [
                {
                  area_id: 'a1',
                  nama_area: 'Ash Handling System',
                  point_detail: [
                    {
                      DAY: {
                        task_detail: [
                          {
                            notes: 'Foto after diganti karena foto sebelumnya blur',
                            status: 'COMPLETED',
                            open_date: '2026-10-15T08:30:00+07:00',
                            close_date: '2026-10-15T09:00:00+07:00',
                            worker_name: 'Andi Hidayat',
                            assignment_id: 'as1',
                            category_note: 'UNSAFE_CONDITION',
                          },
                        ],
                      },
                      nama_point: 'Ash Conveyor',
                      total_worker: 1,
                      pending_detail: [],
                      pipeline_item_id: 'pi1',
                      total_assignment: 1,
                    },
                    {
                      NIGHT: {
                        task_detail: [
                          {
                            status: 'IN_PROGRESS',
                            open_date: '2026-10-15T00:30:00+07:00',
                            close_date: null,
                            worker_name: 'Fikri Hidayat',
                            assignment_id: 'as2',
                            category_note: '-',
                          },
                        ],
                      },
                      nama_point: 'Ash Hopper',
                      pending_detail: [],
                      pipeline_item_id: 'pi2',
                    },
                    {
                      nama_point: 'Fly Ash Silo',
                      pending_detail: [
                        { status: 'PENDING', worker_name: 'Fikri Hidayat', assignment_id: 'as3' },
                      ],
                      pipeline_item_id: 'pi3',
                    },
                  ],
                  total_point_per_area: 3,
                  total_worker_per_area: 2,
                  total_assignment_per_area: 3,
                },
              ],
              total_point: 64,
              total_worker: 10,
              total_assignment: 64,
            },
          },
        ],
      },
    },
  };

  it('reads the nested data, areas, points, shifts and pending assignments', () => {
    const [vendor] = toVendorProgress(detail);
    expect(vendor).toMatchObject({ vendorName: 'CV Sinergi Perkasa', notStarted: 19, percent: 58 });
    const [area] = vendor.areas;
    expect(area).toMatchObject({
      name: 'Ash Handling System',
      points: 3,
      workers: 2,
      total: 3,
      completed: 1,
      inProgress: 1,
      notStarted: 1,
      percent: 33,
      shifts: ['DAY', 'NIGHT'],
    });
    expect(area.pointList.map((p) => [p.name, p.tasks.length, p.pending.length])).toEqual([
      ['Ash Conveyor', 1, 0],
      ['Ash Hopper', 1, 0],
      ['Fly Ash Silo', 0, 1],
    ]);
    expect(area.pointList[0].tasks[0]).toMatchObject({
      shift: 'DAY',
      status: 'COMPLETED',
      workerName: 'Andi Hidayat',
      category: 'UNSAFE_CONDITION',
    });
    expect(area.pointList[1].tasks[0].category).toBeNull();
  });

  it('keeps the reports of every day when merging', () => {
    const [vendor] = mergeVendorProgress([toVendorProgress(detail), toVendorProgress(detail)]);
    expect(vendor.areas[0].pointList[0].tasks).toHaveLength(1);
    expect(vendor.areas[0].total).toBe(6);
  });
});
