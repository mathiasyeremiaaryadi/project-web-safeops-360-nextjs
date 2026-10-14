'use client';

import { tableFeatures, useTable } from '@tanstack/react-table';
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
 */

/**
 * Server-paged table (TanStack Table): rows arrive already filtered and paged by the API.
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
  const table = useTable({
    features,
    columns,
    data,
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
                    className={cn(
                      'px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
                      meta?.hideBelow && HIDE_BELOW[meta.hideBelow],
                      meta?.className,
                    )}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
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
