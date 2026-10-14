'use client';

import { DataTable } from '@/components/shared/data-table';
import { cn } from '@/lib/utils';

/**
 * Cards below 768px, a table from 768px. Both are rendered and switched with CSS (no media
 * query hook → no hydration mismatch).
 * @template T
 * @param {object} props
 * @param {T[]} props.data
 * @param {any[]} props.columns
 * @param {(item: T) => import('react').ReactNode} props.renderCard
 * @param {(row: T) => string} props.getRowId
 * @param {string} props.caption
 * @param {(row: T) => void} [props.onRowClick]
 * @param {(row: T) => boolean} [props.isRowSelected]
 * @param {string} [props.cardGridClassName] e.g. `sm:grid-cols-2`
 * @param {import('react').ReactNode} [props.footer] Pagination, shown under both layouts.
 */
export function ResponsiveList({
  data,
  columns,
  renderCard,
  getRowId,
  caption,
  onRowClick,
  isRowSelected,
  cardGridClassName,
  footer,
}) {
  return (
    <>
      <ul className={cn('grid gap-3 md:hidden', cardGridClassName)} aria-label={caption}>
        {data.map((item) => (
          <li key={getRowId(item)}>{renderCard(item)}</li>
        ))}
      </ul>
      {footer ? <div className="mt-3 md:hidden">{footer}</div> : null}

      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <DataTable
          columns={columns}
          data={data}
          getRowId={getRowId}
          caption={caption}
          onRowClick={onRowClick}
          isRowSelected={isRowSelected}
        />
        {footer ? <div className="border-t px-4 py-3">{footer}</div> : null}
      </div>
    </>
  );
}
