import { MousePointerClick } from 'lucide-react';

/**
 * List + detail panel side by side from 2XL (1536px); below that only the list is shown and rows
 * open the detail page. CSS only, no media query hook.
 * @param {object} props
 * @param {import('react').ReactNode} props.children The list.
 * @param {import('react').ReactNode} props.panel Detail of the selected record, or `null`.
 * @param {string} props.panelLabel Accessible name of the panel.
 */
export function ListWithPanel({ children, panel, panelLabel }) {
  return (
    <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_460px] 2xl:items-start 2xl:gap-6">
      <div className="min-w-0">{children}</div>
      <aside
        aria-label={panelLabel}
        className="hidden rounded-2xl border bg-card p-5 2xl:sticky 2xl:top-24 2xl:block 2xl:max-h-[calc(100dvh-7.5rem)] 2xl:overflow-y-auto"
      >
        {panel ?? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <MousePointerClick aria-hidden="true" className="size-8" />
            <p className="text-sm">Pilih laporan untuk melihat detailnya di sini.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
