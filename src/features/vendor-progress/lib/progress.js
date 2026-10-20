/*
 * GET /api/v1/dashboard/summary
 * GET /api/v1/dashboard/summary/detail?type=vendor_progress
 *
 * Vendor Progress menggunakan satu tanggal untuk setiap request.
 *
 * Format response yang didukung:
 * - { data: { vendor_progress: [...] } }
 * - { data: { type, data: { vendor_progress: [...] } } }
 * - { vendor_progress: [...] }
 */

/** @param {unknown} value */
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** @param {unknown} value */
const toCount = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

/** @param {number} completed @param {number} total */
const percentOf = (completed, total) =>
  total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

const STATUS = Object.freeze({
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
});

const CHECK_POINT_STATUS = Object.freeze({
  COMPLETE: 'COMPLETE',
  INCOMPLETE: 'INCOMPLETE',
});

/**
 * Mengambil nilai pertama yang bukan null, undefined, atau string kosong.
 * Nilai 0 dan false tetap dipertahankan.
 *
 * @param {...any} values
 */
const firstDefined = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== '');

/** @param {unknown} value */
const toCategory = (value) => {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  return text && text !== '-' ? text : null;
};

/**
 * @param {unknown} value
 * @returns {'COMPLETE' | 'INCOMPLETE' | null}
 */
const toCheckPointStatus = (value) => {
  const status = String(value ?? '')
    .trim()
    .toUpperCase();

  if (status === CHECK_POINT_STATUS.COMPLETE) return CHECK_POINT_STATUS.COMPLETE;
  if (status === CHECK_POINT_STATUS.INCOMPLETE) return CHECK_POINT_STATUS.INCOMPLETE;

  return null;
};

/**
 * @typedef {object} PointTask
 * @property {string} key
 * @property {string} shift
 * @property {string} status
 * @property {string | null} openDate
 * @property {string | null} closeDate
 * @property {string | null} workerName
 * @property {string | null} notes
 * @property {string | null} category
 * @property {string | null} assignmentId
 */

/**
 * @typedef {object} PointProgress
 * @property {string} key
 * @property {string} name
 * @property {number} workers
 * @property {number} assignments
 * @property {number} totalReports
 * @property {PointTask[]} tasks
 * @property {{ key: string, workerName: string | null }[]} pending
 */

/**
 * @typedef {object} AreaProgress
 * @property {string} key
 * @property {string} name
 * @property {number} points
 * @property {number} workers
 * @property {number} total
 * @property {number} completed
 * @property {number} inProgress
 * @property {number} notStarted
 * @property {number} percent
 * @property {string[]} shifts
 * @property {PointProgress[]} pointList
 */

/**
 * @typedef {object} CheckPointDetail
 * @property {'COMPLETE' | 'INCOMPLETE' | null} status
 * @property {number} totalTargetPoint
 * @property {number} totalAssignedPoint
 * @property {number} totalUnassignedPoint
 * @property {{ areaId: string | null, itemId: string | null, areaName: string | null, pointName: string | null, pipelineItemId: string | null }[]} unassignedPointDetail
 */

/**
 * @typedef {object} VendorProgress
 * @property {string} vendorId
 * @property {string | null} vendorName
 * @property {string | null} siteId
 * @property {string | null} siteName
 * @property {'COMPLETE' | 'INCOMPLETE' | null} statusCheckPoint
 * @property {CheckPointDetail | null} checkPoint
 * @property {number} total
 * @property {number} completed
 * @property {number} inProgress
 * @property {number} notStarted
 * @property {number} percent
 * `totals.assignments` dipertahankan sebagai nama properti internal untuk kompatibilitas,
 * tetapi nilainya berasal dari `total_task` response BE.
 * @property {{ areas: number, points: number, workers: number, assignments: number, reports: number }} totals
 * @property {AreaProgress[]} areas
 */

/**
 * Normalisasi satu report row dari shift_detail.
 *
 * Report ID diprioritaskan agar beberapa report dari assignment
 * yang sama tidak dianggap sebagai satu report.
 *
 * @param {string} shift
 * @param {any} task
 * @param {number} index
 * @returns {PointTask}
 */
const toTask = (shift, task, index) => {
  const assignmentId = firstDefined(
    task.assignment_id,
    task.pipeline_item_assignment_id,
    task.assignment?.id,
  );

  const reportId = firstDefined(task.report_id, task.id, task.report?.id);

  return {
    key: [reportId ?? assignmentId ?? index, shift, task.open_date ?? task.opened_at ?? ''].join(
      '|',
    ),

    shift,

    status: String(task.status ?? '')
      .trim()
      .toUpperCase(),

    openDate: firstDefined(task.open_date, task.opened_at) ?? null,

    closeDate: firstDefined(task.close_date, task.closed_date, task.closed_at) ?? null,

    workerName:
      firstDefined(
        task.worker_name,
        task.worker?.full_name,
        task.user_name,
        task.user?.full_name,
      ) ?? null,

    notes: firstDefined(task.notes, task.note, task.description) ?? null,

    category: toCategory(firstDefined(task.category_note, task.note_category, task.category)),

    assignmentId: assignmentId != null ? String(assignmentId) : null,
  };
};

/**
 * Parse report rows yang dikelompokkan berdasarkan shift.
 *
 * @param {any} raw
 * @returns {PointTask[]}
 */
function toTasks(raw) {
  if (!isRecord(raw)) return [];

  const shifts = isRecord(raw.shift_detail) ? raw.shift_detail : raw;

  return Object.entries(shifts).flatMap(([shift, value]) => {
    if (!isRecord(value)) return [];

    const list = firstDefined(value.task_detail, value.report_detail, value.reports);

    if (!Array.isArray(list)) return [];

    return list.filter(isRecord).map((task, index) => toTask(shift, task, index));
  });
}

/**
 * Parse satu point yang sudah memiliki assignment.
 *
 * @param {any} raw
 * @param {number} index
 * @returns {PointProgress}
 */
function toPoint(raw, index) {
  const name = firstDefined(raw.nama_point, raw.point_name, raw.point?.name, raw.name);

  const pendingRaw = firstDefined(raw.pending_detail, raw.pending_assignments, raw.pending_list);

  const pending = Array.isArray(pendingRaw) ? pendingRaw.filter(isRecord) : [];

  const tasks = toTasks(raw);

  const reportedAssignmentIds = new Set(tasks.map((task) => task.assignmentId).filter(Boolean));

  const pendingAssignmentIds = new Set(
    pending
      .map((item, pendingIndex) =>
        firstDefined(
          item.assignment_id,
          item.pipeline_item_assignment_id,
          item.assignment?.id,
          item.id,
          `pending-${pendingIndex}`,
        ),
      )
      .map(String),
  );

  // Detail point saat ini tidak mengirim total_task per point.
  // Hitung assignment unik dari report dan pending assignment yang tersedia.
  const assignmentCount = firstDefined(raw.total_task);

  const assignments =
    assignmentCount !== undefined
      ? toCount(assignmentCount)
      : new Set([...reportedAssignmentIds, ...pendingAssignmentIds]).size;

  return {
    key: String(
      firstDefined(raw.pipeline_item_id, raw.pipeline_point_id, raw.point_id, raw.id) ??
        `point-${index}`,
    ),

    name: name ? String(name) : `Titik ${index + 1}`,

    workers: toCount(firstDefined(raw.total_worker, raw.total_workers)),

    assignments,

    // Jumlah report adalah jumlah report row, bukan assignment.
    totalReports: toCount(firstDefined(raw.total_report, raw.total_reports, tasks.length)),

    tasks,

    pending: pending.map((item, pendingIndex) => ({
      key: String(
        firstDefined(
          item.assignment_id,
          item.pipeline_item_assignment_id,
          item.assignment?.id,
          item.id,
        ) ?? `pending-${pendingIndex}`,
      ),

      workerName:
        firstDefined(
          item.worker_name,
          item.worker?.full_name,
          item.user_name,
          item.user?.full_name,
        ) ?? null,
    })),
  };
}

/**
 * Statistik report dan assignment pending.
 *
 * @param {PointProgress[]} points
 */
function countPoints(points) {
  const tasks = points.flatMap((point) => point.tasks);

  const pendingCount = points.reduce((sum, point) => sum + point.pending.length, 0);

  return {
    completed: tasks.filter((task) => task.status === STATUS.COMPLETED).length,

    inProgress: tasks.filter((task) => task.status === STATUS.IN_PROGRESS).length,

    notStarted: pendingCount,

    total: tasks.length + pendingCount,
  };
}

/**
 * Satu point dianggap selesai apabila memiliki report dan
 * seluruh report-nya berstatus COMPLETED.
 *
 * @param {PointProgress[]} points
 * @returns {number}
 */
function countCompletedPoints(points) {
  return points.filter(
    (point) =>
      point.tasks.length > 0 && point.tasks.every((task) => task.status === STATUS.COMPLETED),
  ).length;
}

/**
 * Parse satu area dan daftar point-nya.
 *
 * @param {any} raw
 * @param {number} index
 * @returns {AreaProgress}
 */
function toArea(raw, index) {
  const rawPoints = firstDefined(raw.point_detail, raw.points, raw.point_list);

  const pointList = (Array.isArray(rawPoints) ? rawPoints : [])
    .filter(isRecord)
    .map((point, pointIndex) => toPoint(point, pointIndex));

  const counted = countPoints(pointList);

  const name = firstDefined(raw.nama_area, raw.area_name, raw.name, raw.area, raw.pipeline_name);

  const total = toCount(
    firstDefined(
      raw.total_report_per_area,
      raw.total_report,
      raw.total_reports,
      raw.total,
      counted.total,
    ),
  );

  const completed = toCount(firstDefined(raw.completed, raw.completed_count, counted.completed));

  const inProgress = toCount(
    firstDefined(raw.in_progress, raw.in_progress_count, counted.inProgress),
  );

  const notStarted = toCount(
    firstDefined(raw.not_started, raw.pending, raw.pending_count, counted.notStarted),
  );

  const totalPoints = toCount(
    firstDefined(raw.total_point_per_area, raw.total_point, raw.total_points, pointList.length),
  );

  const completedPoints = countCompletedPoints(pointList);

  return {
    key: String(firstDefined(raw.area_id, raw.pipeline_id, raw.id, name) ?? `area-${index}`),

    name: name ? String(name) : `Area ${index + 1}`,

    points: totalPoints,

    workers: toCount(firstDefined(raw.total_worker_per_area, raw.total_worker, raw.total_workers)),

    total,
    completed,
    inProgress,
    notStarted,

    // Progres area dihitung dari point selesai, bukan jumlah report.
    percent: percentOf(completedPoints, totalPoints),

    shifts: [...new Set(pointList.flatMap((point) => point.tasks.map((task) => task.shift)))],

    pointList,
  };
}

/**
 * Parse checkpoint dari vendor_progress_detail.check_point.
 *
 * @param {any} raw
 * @returns {CheckPointDetail | null}
 */
function toCheckPoint(raw) {
  if (!isRecord(raw)) return null;

  const unassignedRaw = firstDefined(
    raw.unassigned_point_detail,
    raw.unassigned_points,
    raw.unassigned_detail,
  );

  const unassignedPointDetail = (Array.isArray(unassignedRaw) ? unassignedRaw : [])
    .filter(isRecord)
    .map((item) => ({
      areaId: firstDefined(item.area_id, item.pipeline_id) ?? null,

      itemId: firstDefined(item.item_id, item.point_id) ?? null,

      areaName: firstDefined(item.nama_area, item.area_name) ?? null,

      pointName: firstDefined(item.nama_point, item.point_name) ?? null,

      pipelineItemId: firstDefined(item.pipeline_item_id, item.pipeline_point_id) ?? null,
    }));

  return {
    status: toCheckPointStatus(raw.status),

    totalTargetPoint: toCount(
      firstDefined(raw.total_target_point, raw.total_target, raw.target_point, raw.total_point),
    ),

    totalAssignedPoint: toCount(
      firstDefined(raw.total_assigned_point, raw.total_assigned, raw.assigned_point),
    ),

    totalUnassignedPoint: toCount(
      firstDefined(
        raw.total_unassigned_point,
        raw.total_unassigned,
        raw.unassigned_point,
        raw.total_unassignment,
        unassignedPointDetail.length,
      ),
    ),

    unassignedPointDetail,
  };
}

/**
 * Parse satu vendor row dari response summary atau detail.
 *
 * @param {any} raw
 * @returns {VendorProgress}
 */
function toVendor(raw) {
  const detail = isRecord(raw.vendor_progress_detail)
    ? raw.vendor_progress_detail
    : isRecord(raw.detail)
      ? raw.detail
      : {};

  const rawAreas = firstDefined(detail.area_detail, detail.areas, raw.area_detail);

  const areas = (Array.isArray(rawAreas) ? rawAreas : [])
    .filter(isRecord)
    .map((area, index) => toArea(area, index));

  const checkPoint = toCheckPoint(firstDefined(detail.check_point, raw.check_point));

  const completed = toCount(raw.completed);
  const inProgress = toCount(raw.in_progress);
  const notStarted = toCount(firstDefined(raw.not_started, raw.pending));

  // Progress vendor menggunakan total_task, bukan total point atau total report.
  const total = toCount(firstDefined(raw.total_task, completed + inProgress + notStarted));

  return {
    vendorId: String(firstDefined(raw.vendor_id, raw.vendor?.id, raw.id) ?? ''),

    vendorName: firstDefined(raw.vendor_name, raw.vendor?.name, raw.name) ?? null,

    siteId: firstDefined(raw.site_id, raw.site?.id) ?? null,

    siteName: firstDefined(raw.site_name, raw.site?.name) ?? null,

    statusCheckPoint: toCheckPointStatus(
      firstDefined(raw.status_check_point, detail.status_check_point, detail.check_point?.status),
    ),

    checkPoint,

    total,
    completed,
    inProgress,
    notStarted,

    percent: toCount(
      firstDefined(raw.progress_percentage, raw.percent, percentOf(completed, total)),
    ),

    totals: {
      areas: toCount(
        firstDefined(detail.total_area, detail.total_areas, raw.total_area, areas.length),
      ),

      points: toCount(
        firstDefined(
          detail.total_point,
          detail.total_points,
          raw.total_point,
          checkPoint?.totalTargetPoint,
        ),
      ),

      workers: toCount(
        firstDefined(
          detail.total_worker,
          detail.total_workers,
          raw.total_worker,
          raw.total_workers,
        ),
      ),

      // Properti internal `assignments` dipertahankan agar komponen FE yang
      // sudah menggunakannya tidak rusak; sumber nilainya sekarang total_task.
      assignments: toCount(firstDefined(detail.total_task, raw.total_task)),

      reports: toCount(
        firstDefined(
          detail.total_report,
          detail.total_reports,
          raw.total_report,
          raw.total_reports,
          areas.reduce((sum, area) => sum + area.total, 0),
        ),
      ),
    },

    areas,
  };
}

/**
 * Cari vendor_progress tanpa bergantung pada jumlah pembungkus response.
 *
 * @param {unknown} raw
 * @returns {VendorProgress[]}
 */
export function toVendorProgress(raw) {
  let current = isRecord(raw) ? raw : {};

  for (let depth = 0; depth < 6; depth += 1) {
    if (Array.isArray(current.vendor_progress)) {
      return current.vendor_progress
        .filter(isRecord)
        .map(toVendor)
        .filter((row) => row.vendorId);
    }

    if (!isRecord(current.data)) break;

    current = current.data;
  }

  return [];
}
