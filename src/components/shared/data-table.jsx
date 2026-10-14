'use client';

import { useMemo, useState } from 'react';
import { tableFeatures, useTable } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { compareValues } from '@/lib/search';
import { cn } from '@/lib/utils';

const features = tableFeatures({});

/** Columns can hide below a breakpoint via `meta.hideBelow`. */
const HIDE_BELOW = Object.freeze({
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
});

/**
 * @typedef {object} ColumnMeta
 * @property {'lg' | 'xl'} [hideBelow]
 * @property {string} [className] Extra classes for the header and cells.
 * @property {(row: any) => string | number | null | undefined} [sortValue] Makes the column
 *   sortable by clicking its header (sorts the rows shown on this page).
 */

/** @typedef {{ id: string, desc: boolean } | null} SortState */

/**
 * Next sort state when a header is clicked: ascending → descending → off.
 * @param {SortState} current
 * @param {string} id
 * @returns {SortState}
 */
export function nextSort(current, id) {
  if (current?.id !== id) return { id, desc: false };
  return current.desc ? null : { id, desc: true };
}

/** @param {SortState} sort @param {string} id */
function ariaSort(sort, id) {
  if (sort?.id !== id) return 'none';
  return sort.desc ? 'descending' : 'ascending';
}

/** @param {{ sort: SortState, id: string }} props */
function SortIcon({ sort, id }) {
  if (sort?.id !== id) return <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-50" />;
  return sort.desc ? (
    <ArrowDown aria-hidden="true" className="size-3.5" />
  ) : (
    <ArrowUp aria-hidden="true" className="size-3.5" />
  );
}

/**
 * Header label; a sort button when the column is sortable.
 * @param {{ sortable: boolean, sort: SortState, id: string, onSort: () => void, children: import('react').ReactNode }} props
 */
function HeaderContent({ sortable, sort, id, onSort, children }) {
  if (!sortable) return children;
  return (
    <button
      type="button"
      onClick={onSort}
      className="-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <SortIcon sort={sort} id={id} />
    </button>
  );
}

/**
 * Server-paged table (TanStack Table): rows arrive already filtered and paged by the API.
 * Columns with `meta.sortValue` can be sorted by clicking their header.
 * @template T
 * @param {object} props
 * @param {any[]} props.columns Column defs `{ id, header, cell, meta?: ColumnMeta }`.
 * @param {T[]} props.data
 * @param {(row: T) => string} [props.getRowId]
 * @param {(row: T) => void} [props.onRowClick] Mouse shortcut; keep a link in a cell for keyboards.
 * @param {(row: T) => boolean} [props.isRowSelected]
 * @param {string} props.caption Accessible table name.
 */
export function DataTable({ columns, data, getRowId, onRowClick, isRowSelected, caption }) {
  const [sort, setSort] = useState(/** @type {SortState} */ (null));
  const rows = useMemo(() => {
    const sortValue = columns.find((column) => column.id === sort?.id)?.meta?.sortValue;
    if (!sort || !sortValue) return data;
    const sorted = [...data].sort((a, b) => compareValues(sortValue(a), sortValue(b)));
    return sort.desc ? sorted.reverse() : sorted;
  }, [columns, data, sort]);

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const meta = /** @type {ColumnMeta | undefined} */ (header.column.columnDef.meta);
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={meta?.sortValue ? ariaSort(sort, header.column.id) : undefined}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
                      meta?.hideBelow && HIDE_BELOW[meta.hideBelow],
                      meta?.className,
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <HeaderContent
                        sortable={Boolean(meta?.sortValue)}
                        sort={sort}
                        id={header.column.id}
                        onSort={() => setSort((current) => nextSort(current, header.column.id))}
                      >
                        <table.FlexRender header={header} />
                      </HeaderContent>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              aria-selected={isRowSelected ? isRowSelected(row.original) : undefined}
              className={cn(
                'border-t transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted/60',
                isRowSelected?.(row.original) && 'bg-info-bg/60',
              )}
            >
              {row.getAllCells().map((cell) => {
                const meta = /** @type {ColumnMeta | undefined} */ (cell.column.columnDef.meta);
                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-4 py-3 align-middle text-foreground',
                      meta?.hideBelow && HIDE_BELOW[meta.hideBelow],
                      meta?.className,
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
