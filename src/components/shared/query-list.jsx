'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveList } from '@/components/shared/responsive-list';

/**
 * The four states every list must handle — loading, error (with "Coba lagi"), empty and data —
 * plus pagination, around `ResponsiveList` (cards below 768px, table from 768px).
 *
 * @example
 * <QueryList
 *   query={query}                 // useListQuery(...) result
 *   rows={rows}                   // the rows to show (e.g. after client-side search)
 *   empty={{ icon: Building2, title: 'Belum ada site', description: '…' }}
 *   noun="site"                   // "1–20 dari 45 site"
 *   onPageChange={setPage}
 *   columns={columns} getRowId={(site) => site.id} caption="Daftar site"
 *   renderCard={(site) => <SiteCard site={site} />}
 * />
 *
 * @template T
 * @param {object} props
 * @param {import('@tanstack/react-query').UseQueryResult<{ data: T[], page: number, limit: number, total?: number }>} props.query
 * @param {T[]} props.rows
 * @param {{ icon: import('lucide-react').LucideIcon, title: string, description: string }} props.empty
 * @param {string} props.noun
 * @param {(page: number) => void} props.onPageChange
 * @param {any[]} props.columns
 * @param {(row: T) => string} props.getRowId
 * @param {string} props.caption
 * @param {(row: T) => import('react').ReactNode} props.renderCard
 * @param {(row: T) => void} [props.onRowClick]
 * @param {(row: T) => boolean} [props.isRowSelected]
 * @param {string} [props.cardGridClassName]
 */
export function QueryList({ query, rows, empty, noun, onPageChange, ...listProps }) {
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (rows.length === 0) return <EmptyState {...empty} />;

  return (
    <ResponsiveList
      data={rows}
      {...listProps}
      footer={
        <Pagination
          page={query.data.page}
          limit={query.data.limit}
          total={query.data.total}
          count={query.data.data.length}
          noun={noun}
          onPageChange={onPageChange}
        />
      }
    />
  );
}
