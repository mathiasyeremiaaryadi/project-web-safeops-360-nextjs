'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { NotFoundState } from '@/components/shared/not-found-state';
import { useVendorProgressDetail } from '@/features/vendor-progress/api/queries';
import {
  AreaProgressList,
  findingsOf,
} from '@/features/vendor-progress/components/area-progress-list';
import { ProgressBar } from '@/features/vendor-progress/components/progress-bar';
import { ProgressDateFilter } from '@/features/vendor-progress/components/progress-date-filter';
import {
  useProgressFilters,
  useSiteNames,
} from '@/features/vendor-progress/hooks/use-progress-filters';
import { formatLongDate } from '@/lib/date';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';

/**
 * @typedef {import('@/features/vendor-progress/lib/progress').VendorProgress} VendorProgress
 */

/**
 * Persentase progres berdasarkan completed / total_task.
 *
 * @param {Pick<VendorProgress, 'completed' | 'total'>} row
 */
const getProgressPercent = (row) => {
  const totalTask = Number(row.total) || 0;
  const completed = Number(row.completed) || 0;

  if (totalTask <= 0) return 0;

  return Math.round((completed / totalTask) * 10000) / 100;
};

/**
 * Status checkpoint.
 *
 * @param {{ status: string | null | undefined }} props
 */
function CheckPointStatus({ status }) {
  const normalized = String(status ?? '')
    .trim()
    .toUpperCase();

  if (!normalized) {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        Status belum tersedia
      </span>
    );
  }

  const isComplete = normalized === 'COMPLETE';

  return (
    <span
      className={[
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5',
        'text-xs font-semibold',
        isComplete
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
      ].join(' ')}
    >
      {isComplete ? (
        <CheckCircle2 aria-hidden="true" className="size-4" />
      ) : (
        <CircleAlert aria-hidden="true" className="size-4" />
      )}
      {isComplete ? 'Complete' : 'Incomplete'}
    </span>
  );
}

/**
 * Kartu statistik informasi tambahan.
 *
 * @param {{
 *   label: string,
 *   value: number | string | null | undefined,
 *   icon: import('lucide-react').LucideIcon
 * }} props
 */
function InfoStat({ label, value, icon: Icon }) {
  return (
    <div className="flex min-h-[88px] min-w-0 items-start gap-3 rounded-xl border bg-card p-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold break-words text-foreground tabular-nums">
          {value ?? 0}
        </p>
      </div>
    </div>
  );
}

/**
 * /vendor-progress/[vendorId]
 *
 * Detail progres vendor untuk satu tanggal.
 *
 * @param {{ vendorId: string }} props
 */
export function VendorProgressDetail({ vendorId }) {
  const { setParams, today, date, siteId, search } = useProgressFilters();

  const query = useVendorProgressDetail({
    date,
    site_id: siteId,
    vendor_id: vendorId,
  });

  const siteNameOf = useSiteNames(siteId);
  const backHref = `/vendor-progress${search ? `?${search}` : ''}`;

  const rows =
    query.data?.data?.filter(
      (row) => row.vendorId === vendorId && (!siteId || !row.siteId || row.siteId === siteId),
    ) ?? [];

  const vendor = rows[0];
  const dateLabel = formatLongDate(date);

  const header = (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Kembali ke progress vendor
      </Link>

      <ProgressDateFilter date={date} today={today} onChange={setParams} className="sm:w-48" />
    </div>
  );

  if (query.isPending) {
    return (
      <>
        {header}
        <ListSkeleton rows={3} />
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        {header}
        <ErrorState onRetry={() => query.refetch()} />
      </>
    );
  }

  if (!vendor) {
    return (
      <>
        <PageHeader title="Progress vendor" />
        {header}
        <NotFoundState
          title="Progres tidak ditemukan"
          description="Vendor ini tidak memiliki data pada tanggal dan site yang dipilih, atau berada di luar cakupan akses Anda."
        />
      </>
    );
  }

  const name = vendor.vendorName ?? 'Vendor';

  const stats = [
    { label: 'Total task', value: vendor.total },
    { label: 'Selesai', value: vendor.completed },
    { label: 'Dikerjakan', value: vendor.inProgress },
    { label: 'Belum dikerjakan', value: vendor.notStarted },
  ];

  const checkpointStatus = vendor.statusCheckPoint ?? vendor.checkPoint?.status;

  const unassignedCount = vendor.checkPoint?.totalUnassignedPoint ?? 0;

  const safetyFindings = (vendor.areas ?? []).reduce((sum, area) => sum + findingsOf(area), 0);

  const infoStats = [
    {
      label: 'Worker',
      value: vendor.totals.workers,
      icon: Users,
    },
    {
      label: 'Report',
      value: vendor.totals.reports,
      icon: FileText,
    },
    {
      label: 'Unassignment',
      value: unassignedCount,
      icon: CircleAlert,
    },
    {
      label: 'Accident',
      value: safetyFindings,
      icon: ClipboardCheck,
    },
  ];

  return (
    <>
      <PageHeader
        title={name}
        description={[siteNameOf(vendor), dateLabel].filter(Boolean).join(' · ')}
      />

      {header}

      <div className="flex flex-col gap-5">
        {/* Ringkasan progres */}
        <section
          aria-labelledby="progress-summary-title"
          className="rounded-2xl border bg-card p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="progress-summary-title" className="text-lg font-semibold text-foreground">
                Ringkasan progres
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Status pekerjaan vendor pada {dateLabel}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              <span>{siteNameOf(vendor) || 'Site tidak tersedia'}</span>
            </div>
          </div>

          <div className="mb-5">
            <ProgressBar percent={getProgressPercent(vendor)} label={`Progres ${name}`} />
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ label, value }) => (
              <div key={label} className="rounded-xl border bg-muted/30 p-3.5">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                  {value ?? 0}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Panel Check Point dan Aktivitas Operasional */}
        <section
          aria-label="Penugasan titik dan aktivitas operasional"
          className="rounded-2xl border bg-card p-5 sm:p-6"
        >
          <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-0">
            {/* Kolom kiri: Check Point */}
            <div className="flex min-w-0 flex-col lg:pr-6">
              <div className="mb-5 flex min-h-[64px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardCheck aria-hidden="true" className="size-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Check Point</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ringkasan target area dan point
                    </p>
                  </div>
                </div>

                <CheckPointStatus status={checkpointStatus} />
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="min-h-[112px] rounded-xl border bg-muted/30 p-4">
                  <dt className="text-sm text-muted-foreground">Area</dt>
                  <dd className="mt-2 text-3xl font-semibold text-foreground tabular-nums">
                    {vendor.totals.areas ?? 0}
                  </dd>
                </div>

                <div className="min-h-[112px] rounded-xl border bg-muted/30 p-4">
                  <dt className="text-sm text-muted-foreground">Point</dt>
                  <dd className="mt-2 text-3xl font-semibold text-foreground tabular-nums">
                    {vendor.totals.points ?? 0}
                  </dd>
                </div>
              </dl>

              {/* Keterangan status penugasan */}
              <div className="mt-4 space-y-2 text-xs text-foreground">
                <p className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>
                    <strong>Completed</strong> — Semua point sudah ditugaskan.
                  </span>
                </p>

                <p className="flex items-center gap-2">
                  <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>
                    <strong>Incomplete</strong> — Masih ada point yang belum ditugaskan.
                  </span>
                </p>
              </div>
            </div>

            {/* Kolom kanan: Aktivitas Operasional */}
            <div className="flex min-w-0 flex-col border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <div className="mb-5 flex min-h-[64px] items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText aria-hidden="true" className="size-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground">Operasional</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Ringkasan aktivitas lapangan</p>
                </div>
              </div>

              <dl className="grid flex-1 grid-cols-1 content-start gap-3 sm:grid-cols-2">
                {infoStats.map((stat) => {
                  const labelMap = {
                    Worker: 'Pekerja',
                    Report: 'Laporan',
                    Unassignment: 'Unassignment',
                    Accident: 'Insiden',
                  };

                  return (
                    <InfoStat
                      key={stat.label}
                      label={labelMap[stat.label] ?? stat.label}
                      value={stat.value}
                      icon={stat.icon}
                    />
                  );
                })}
              </dl>
            </div>
          </div>
        </section>
      </div>

      {/* Panel Progres per area */}
      <section aria-labelledby="area-title" className="mt-5 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-4">
          <h2 id="area-title" className="text-lg font-semibold text-foreground">
            Progres per area
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rincian point dan laporan untuk setiap area
          </p>
        </div>

        <AreaProgressList areas={vendor.areas ?? []} checkPoint={vendor.checkPoint ?? null} />
      </section>
    </>
  );
}
