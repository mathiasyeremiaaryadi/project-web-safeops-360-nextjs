'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { formatTime } from '@/lib/date';
import { NOTE_CATEGORY_LABELS } from '@/lib/task-reports';
import { cn } from '@/lib/utils';
import { countByCategory } from '@/features/dashboard/lib/safety';

/** @type {Record<string, 'warning' | 'danger' | 'info'>} */
const CATEGORY_VARIANTS = {
  NEAR_MISS: 'warning',
  UNSAFE_ACTION: 'danger',
  UNSAFE_CONDITION: 'info',
};
const SHIFT_LABELS = Object.freeze({ DAY: 'Pagi', EVENING: 'Sore', NIGHT: 'Malam' });

/** @param {import('@/features/dashboard/lib/safety').SafetyNote} n */
function timeText(n) {
  const shift = n.shift
    ? `Shift ${SHIFT_LABELS[/** @type {keyof typeof SHIFT_LABELS} */ (n.shift)] ?? n.shift}`
    : null;
  const time = n.openedAt
    ? `${formatTime(n.openedAt)}${n.closedAt ? `–${formatTime(n.closedAt)}` : ''}`
    : null;
  return [shift, time].filter(Boolean).join(' · ');
}

/**
 * "Catatan safety" of the day (same date, site and vendor as the dashboard), newest first, with
 * a filter per category. The list scrolls inside the panel.
 * @param {{ query: import('@tanstack/react-query').UseQueryResult<import('@/features/dashboard/lib/safety').SafetyNote[]> }} props
 */
export function SafetyNotesPanel({ query }) {
  const [category, setCategory] = useState('');
  const notes = query.data ?? [];
  const counts = countByCategory(notes);
  const rows = category ? notes.filter((n) => n.category === category) : notes;
  const chips = [
    ['', 'Semua', notes.length],
    ...Object.entries(NOTE_CATEGORY_LABELS).map(([value, label]) => [
      value,
      label,
      counts[value] ?? 0,
    ]),
  ];

  return (
    <section aria-labelledby="safety-notes-title" className="rounded-2xl border bg-card p-5">
      <h2 id="safety-notes-title" className="mb-3 text-lg font-semibold text-foreground">
        Catatan safety
      </h2>

      {query.isPending ? <ListSkeleton rows={3} /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && notes.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Tidak ada catatan safety"
          description="Belum ada temuan safety untuk tanggal dan filter ini."
        />
      ) : null}
      {query.isSuccess && notes.length > 0 ? (
        <>
          <div role="group" aria-label="Kategori catatan" className="mb-3 flex flex-wrap gap-2">
            {chips.map(([value, label, count]) => (
              <button
                key={`category-${value}`}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(String(value))}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  category === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {label} <span className="tabular-nums">({count})</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada catatan untuk kategori ini.
            </p>
          ) : (
            <ul
              aria-label="Daftar catatan safety"
              className="flex max-h-[28rem] flex-col divide-y overflow-y-auto pr-1"
            >
              {rows.map((n) => (
                <li key={n.key} className="flex flex-col gap-1 py-3">
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    {n.category ? (
                      <Badge variant={CATEGORY_VARIANTS[n.category] ?? 'neutral'}>
                        {NOTE_CATEGORY_LABELS[
                          /** @type {keyof typeof NOTE_CATEGORY_LABELS} */ (n.category)
                        ] ?? n.category}
                      </Badge>
                    ) : null}
                    <span className="text-muted-foreground">{timeText(n)}</span>
                  </span>
                  <span className="font-semibold text-foreground">{n.notes || '—'}</span>
                  <span className="text-sm text-muted-foreground">
                    {[n.site, n.area].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {[n.vendor, n.worker].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
