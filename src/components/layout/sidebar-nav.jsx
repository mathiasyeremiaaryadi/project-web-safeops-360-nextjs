'use client';

import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * @param {import('@/config/navigation').NavItem[]} items
 * @returns {{ section: string | null, items: import('@/config/navigation').NavItem[] }[]}
 */
function groupBySection(items) {
  /** @type {{ section: string | null, items: import('@/config/navigation').NavItem[] }[]} */
  const groups = [];
  for (const item of items) {
    const section = item.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}

const ITEM_CLASS =
  'flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-brand-dark-foreground/85 outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Menu list with section titles, for the sidebar (lg+) and the mobile drawer.
 * @param {object} props
 * @param {import('@/config/navigation').NavItem[]} props.items
 * @param {import('@/config/navigation').NavItem | null} props.activeItem
 * @param {() => void} [props.onNavigate]
 */
export function SidebarNav({ items, activeItem, onNavigate }) {
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-1">
      {groupBySection(items).map((group) => (
        <div key={group.section ?? 'main'} className="flex flex-col gap-0.5">
          {group.section ? (
            <p className="mt-4 mb-1 px-3 text-xs font-medium tracking-wide text-brand-dark-muted uppercase">
              {group.section}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            if (item.disabledReason) {
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <span
                      aria-disabled="true"
                      className={cn(ITEM_CLASS, 'cursor-not-allowed opacity-50')}
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" />
                      {item.label}
                      <span className="sr-only"> ({item.disabledReason})</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.disabledReason}</TooltipContent>
                </Tooltip>
              );
            }
            const active = activeItem?.key === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  ITEM_CLASS,
                  'transition-colors hover:bg-brand-dark-active/70',
                  active && 'bg-brand-dark-active font-semibold text-brand-dark-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
