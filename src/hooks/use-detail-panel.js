'use client';

import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';

/** Same breakpoint as Tailwind `2xl` (96rem = 1536px), where the side panel is shown. */
const WIDE_SCREEN = '(min-width: 96rem)';

/**
 * Selection of the 2XL side panel (Review laporan, Laporan inventory). From 1536px a row opens
 * in the panel (`?selected=<id>`); below that it opens the detail page. The layout itself is
 * CSS only — the screen width is read at click time, never during render.
 * @param {(id: string) => string} hrefOf Detail page of a record.
 */
export function useDetailPanel(hrefOf) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useQueryState(
    'selected',
    parseAsString.withDefault('').withOptions({ history: 'replace', clearOnDefault: true }),
  );

  /**
   * Opens a record. With a link click event, the link navigates by itself below 2XL.
   * @param {string} id
   * @param {import('react').MouseEvent} [event]
   */
  const open = (id, event) => {
    if (window.matchMedia(WIDE_SCREEN).matches) {
      event?.preventDefault();
      setSelectedId(id);
    } else if (!event) {
      router.push(hrefOf(id));
    }
  };

  return { selectedId, setSelectedId, open };
}

/**
 * Record to select after `id` was reviewed: the next row, else the previous one, else none.
 * @param {{ id: string }[]} rows
 * @param {string} id
 */
export function neighbourId(rows, id) {
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return '';
  return rows[index + 1]?.id ?? rows[index - 1]?.id ?? '';
}
