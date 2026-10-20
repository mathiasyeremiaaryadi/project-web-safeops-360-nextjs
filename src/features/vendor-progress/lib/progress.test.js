import { describe, expect, it } from 'vitest';
import { toVendorProgress } from '@/features/vendor-progress/lib/progress';

/** Response ringkasan backend dengan dua area. */
const day = (completed, inProgress, notStarted) => ({
  data: {
    filter: {
      site_id: 's1',
      vendor_id: 'v1',
      date: '2026-10-09',
    },
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
          total_point: 55,
          total_worker: 10,
          total_assignment: 59,
          area_detail: [
            {
              area_id: 'a1',
              area_name: 'Turbine Hall',
              total_point: 30,
              total_task: 10,
              completed: 8,
            },
            {
              area_id: 'a2',
              area_name: 'Boiler',
              total_point: 25,
              total_task: 5,
              completed: 4,
            },
          ],
        },
      },
    ],
  },
});

describe('toVendorProgress — summary endpoint', () => {
  it('membaca data vendor, ringkasan, dan persentase area', () => {
    const [row] = toVendorProgress(day(54, 3, 2));

    expect(row).toMatchObject({
      vendorId: 'v1',
      vendorName: 'PT Cahaya Energi Nusantara',
      total: 59,
      completed: 54,
      inProgress: 3,
      notStarted: 2,
      percent: 92,
      totals: {
        areas: 2,
        points: 55,
        workers: 10,
        assignments: 59,
      },
    });

    expect(row.areas.map((area) => [area.name, area.points, area.percent])).toEqual([
      ['Turbine Hall', 30, 80],
      ['Boiler', 25, 80],
    ]);
  });

  it('mengembalikan array kosong jika response tidak dikenal', () => {
    expect(toVendorProgress(null)).toEqual([]);
    expect(toVendorProgress({ data: { vendor_progress: 'x' } })).toEqual([]);
  });
});

describe('toVendorProgress — detail endpoint', () => {
  it('membaca nested response, point, shift, dan pending assignment', () => {
    const [vendor] = toVendorProgress(makeDetailResponse());

    expect(vendor).toMatchObject({
      vendorName: 'CV Sinergi Perkasa',
      notStarted: 19,
      percent: 58,
    });

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

    expect(
      area.pointList.map((point) => [point.name, point.tasks.length, point.pending.length]),
    ).toEqual([
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

  it('membaca site, report per shift, dan pending assignment dari API', () => {
    const [vendor] = toVendorProgress(makeCurrentApiResponse());

    expect(vendor).toMatchObject({
      siteId: 's1',
      siteName: 'PLTU Adipala',
      vendorId: 'v5',
      vendorName: 'PT Cahaya Energi Nusantara',
      total: 3,
      completed: 1,
      inProgress: 1,
      notStarted: 1,
      percent: 33,
    });

    expect(vendor.totals).toMatchObject({
      assignments: 3,
      reports: 2,
    });

    const [area] = vendor.areas;

    expect(area).toMatchObject({
      name: 'Boiler Area',
      points: 2,
      workers: 2,
      total: 3,
      completed: 1,
      inProgress: 1,
      notStarted: 1,
      shifts: ['DAY', 'NIGHT'],
    });

    expect(
      area.pointList.map((point) => [point.tasks.length, point.pending.length, point.assignments]),
    ).toEqual([
      [2, 0, 2],
      [0, 1, 1],
    ]);
  });
});

describe('toVendorProgress — aturan progress checkpoint', () => {
  it('menghitung progress dari task dan tidak memasukkan point belum di-assign', () => {
    const [vendor] = toVendorProgress(makeCheckpointResponse());

    expect(vendor).toMatchObject({
      siteId: '393b6507-322f-4fb8-815a-5fdfe1845b91',
      siteName: 'EXAMPLE-001',
      vendorId: 'f4334a75-c371-41f4-a514-b761c560d87d',
      vendorName: 'PT Sharing Vision',
      total: 2,
      completed: 2,
      inProgress: 0,
      notStarted: 0,
      percent: 100,
    });

    expect(vendor.totals).toMatchObject({
      points: 4,
      reports: 2,
    });

    const [area] = vendor.areas;

    expect(area).toMatchObject({
      name: 'Area Gedung 1',
      points: 2,
      total: 2,
      completed: 2,
      inProgress: 0,
      notStarted: 0,
      percent: 100,
    });

    // Point yang belum di-assign adalah catatan checkpoint.
    // Keduanya tidak menurunkan persentase progress task.
    expect(vendor.percent).toBe(100);
    expect(area.percent).toBe(100);
  });
});

function makeCurrentApiResponse() {
  return {
    data: {
      type: 'vendor_progress',
      data: {
        vendor_progress: [
          {
            site_id: 's1',
            site_name: 'PLTU Adipala',
            vendor_id: 'v5',
            vendor_name: 'PT Cahaya Energi Nusantara',
            total_task: 3,
            completed: 1,
            in_progress: 1,
            pending: 1,
            progress_percentage: 33,
            vendor_progress_detail: {
              total_area: 1,
              total_point: 2,
              total_worker: 2,
              total_report: 2,
              area_detail: [
                {
                  area_id: 'a1',
                  nama_area: 'Boiler Area',
                  total_point_per_area: 2,
                  total_worker_per_area: 2,
                  total_report_per_area: 2,
                  point_detail: [
                    {
                      pipeline_item_id: 'pi1',
                      nama_point: 'Tangga Boiler',
                      total_worker: 1,
                      total_report: 2,
                      pending_detail: [],
                      shift_detail: {
                        DAY: {
                          task_detail: [
                            {
                              report_id: 'r1',
                              assignment_id: 'as1',
                              status: 'COMPLETED',
                            },
                          ],
                        },
                        NIGHT: {
                          task_detail: [
                            {
                              report_id: 'r2',
                              assignment_id: 'as2',
                              status: 'IN_PROGRESS',
                            },
                          ],
                        },
                      },
                    },
                    {
                      pipeline_item_id: 'pi2',
                      nama_point: 'Area Pulverizer',
                      total_worker: 1,
                      total_report: 0,
                      pending_detail: [
                        {
                          assignment_id: 'as3',
                          status: 'PENDING',
                        },
                      ],
                      shift_detail: {},
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  };
}

function makeCheckpointResponse() {
  return {
    data: {
      filter: {
        site_id: '393b6507-322f-4fb8-815a-5fdfe1845b91',
        vendor_id: 'f4334a75-c371-41f4-a514-b761c560d87d',
        date: '2026-10-16',
      },
      task_summary: {
        total_point: 4,
        total_task: 2,
        total_area: 1,
        in_progress: 0,
        completed: 2,
        pending: 0,
      },
      vendor_progress: [
        {
          site_id: '393b6507-322f-4fb8-815a-5fdfe1845b91',
          site_name: 'EXAMPLE-001',
          vendor_id: 'f4334a75-c371-41f4-a514-b761c560d87d',
          vendor_name: 'PT Sharing Vision',
          total_task: 2,
          total_area: 1,
          total_point: 4,
          total_worker: 1,
          total_report: 2,
          completed: 2,
          in_progress: 0,
          pending: 0,
          progress_percentage: 100,
          status_check_point: 'INCOMPLETE',
          vendor_progress_detail: {
            area_detail: [
              {
                area_id: 'f6e6d811-be6b-45c7-a952-91b3cef7d01a',
                nama_area: 'Area Gedung 1',
                point_detail: [
                  {
                    item_id: 'b41abf9c-abff-4521-b1a3-e33f6f0c0948',
                    nama_point: 'Area Parkir Motor',
                    shift_detail: {
                      DAY: {
                        task_detail: [
                          {
                            status: 'COMPLETED',
                            worker_id: 'ff94c41a-be21-4c7e-b6a1-9c631becbcba',
                            worker_name: 'worker.sv.01',
                            assignment_id: 'a4cf0484-6f6c-4de1-a433-5b8dbd4da3b2',
                          },
                        ],
                      },
                    },
                    total_report: 1,
                    total_worker: 1,
                    pending_detail: [],
                    pipeline_item_id: '2bdcf114-b45a-46b6-a141-572f42c0c260',
                  },
                  {
                    item_id: '0534ad12-f9ce-4a67-ba8e-815fac35121d',
                    nama_point: 'Koridor Lantai 1',
                    shift_detail: {
                      DAY: {
                        task_detail: [
                          {
                            status: 'COMPLETED',
                            worker_id: 'ff94c41a-be21-4c7e-b6a1-9c631becbcba',
                            worker_name: 'worker.sv.01',
                            assignment_id: 'ef90bcc4-b20d-4662-9df2-d235f9a03cf7',
                          },
                        ],
                      },
                    },
                    total_report: 1,
                    total_worker: 1,
                    pending_detail: [],
                    pipeline_item_id: '0adf04ef-2bbf-422f-9887-0e234c6e4d3a',
                  },
                ],
                total_point_per_area: 2,
                total_report_per_area: 2,
                total_worker_per_area: 1,
                total_task: 2,
                completed: 2,
              },
            ],
            check_point: {
              status: 'INCOMPLETE',
              total_area: 1,
              total_point: 2,
              total_unassignment: 2,
              unassigned_point_detail: [
                {
                  nama_point: 'Coal Bunker',
                },
                {
                  nama_point: 'Saluran Drainase Coal Yard',
                },
              ],
            },
          },
        },
      ],
    },
  };
}

function makeDetailResponse() {
  return {
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
                            report_id: 'r1',
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
                            report_id: 'r2',
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
                      total_worker: 1,
                      pending_detail: [],
                      pipeline_item_id: 'pi2',
                    },
                    {
                      nama_point: 'Fly Ash Silo',
                      pending_detail: [
                        {
                          status: 'PENDING',
                          worker_name: 'Fikri Hidayat',
                          assignment_id: 'as3',
                        },
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
}
