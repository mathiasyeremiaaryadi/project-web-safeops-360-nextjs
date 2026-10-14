'use client';

import { Button } from '@/components/ui/button';

/**
 * "1–20 dari 57 user" + previous/next. When the API sends no `total`, "next" is enabled while
 * the page is full.
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.limit
 * @param {number | undefined} props.total
 * @param {number} props.count Rows on this page.
 * @param {string} props.noun e.g. "user"
 * @param {(page: number) => void} props.onPageChange
 */
export function Pagination({ page, limit, total, count, noun, onPageChange }) {
  const from = count === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + count;
  const hasNext = total === undefined ? count === limit : to < total;
  const summary = total === undefined ? `${count} ${noun}` : `${from}–${to} dari ${total} ${noun}`;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {summary}
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">Halaman {page}</span>
        <Button
          type="button"
          variant="outline"
          className="h-10 bg-card"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 bg-card"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
