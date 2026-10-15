'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ALL_MY_SITES, useSiteContext } from '@/hooks/use-site-context';
import { cn } from '@/lib/utils';

/** Radio value of "all of my sites" (`activeSiteId = null`). */
const ALL = 'all';

/** @param {ReturnType<typeof useSiteContext>} site @param {string} value */
const choose = (site, value) => site.setActiveSiteId(value === ALL ? null : value);

/**
 * Site context in the sidebar (and the mobile drawer): a dropdown for a user with several sites,
 * a read-only label otherwise ("Semua site" for Super Admin, the site name for a one-site Admin).
 */
export function SidebarSiteSwitcher() {
  const site = useSiteContext();
  const boxClass =
    'mx-1 flex min-h-11 items-center justify-between gap-2 rounded-lg border border-brand-dark-foreground/15 bg-brand-dark-active/60 px-3 py-2.5 text-left text-sm';

  if (!site.canSwitch) {
    return (
      <p className={boxClass} aria-label={`Konteks data: ${site.label}`}>
        {site.label}
      </p>
    );
  }
  return (
    <SiteDropdown site={site}>
      <button
        type="button"
        aria-label={`Konteks data: ${site.label}. Ganti site`}
        className={cn(boxClass, 'outline-none hover:bg-brand-dark-active focus-visible:ring-2')}
      >
        <span className="truncate">{site.label}</span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 opacity-70" />
      </button>
    </SiteDropdown>
  );
}

/** Site switcher in the header next to the breadcrumb (768–1023px, where the rail has no room). */
export function HeaderSiteSwitcher() {
  const site = useSiteContext();
  if (!site.canSwitch) return null;
  return (
    <SiteDropdown site={site}>
      <button
        type="button"
        aria-label={`Konteks data: ${site.label}. Ganti site`}
        className="ml-auto inline-flex h-10 max-w-64 items-center gap-2 rounded-lg border bg-card px-3 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <span className="truncate">{site.label}</span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </SiteDropdown>
  );
}

/**
 * Subtitle of the mobile top bar: the site name; with several sites, tapping it opens a sheet
 * to choose the site.
 */
export function MobileSiteSubtitle() {
  const site = useSiteContext();
  const [open, setOpen] = useState(false);

  if (!site.canSwitch) {
    return <p className="truncate text-xs text-muted-foreground">{site.label}</p>;
  }
  const options = [{ value: ALL, label: ALL_MY_SITES }, ...site.sites];
  const current = site.activeSiteId ?? ALL;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Konteks data: ${site.label}. Ganti site`}
        className="flex max-w-full items-center gap-1 text-xs text-muted-foreground"
      >
        <span className="truncate">{site.label}</span>
        <ChevronsUpDown aria-hidden="true" className="size-3 shrink-0" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>Pilih site</SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col px-2">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  aria-pressed={option.value === current}
                  onClick={() => {
                    choose(site, option.value);
                    setOpen(false);
                  }}
                  className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left text-base hover:bg-muted"
                >
                  {option.label}
                  {option.value === current ? (
                    <Check aria-hidden="true" className="size-5 text-primary" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * @param {{ site: ReturnType<typeof useSiteContext>, children: import('react').ReactNode }} props
 *   `children`: the trigger button.
 */
function SiteDropdown({ site, children }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuRadioGroup
          value={site.activeSiteId ?? ALL}
          onValueChange={(value) => choose(site, value)}
        >
          <DropdownMenuRadioItem value={ALL} className="min-h-10">
            {ALL_MY_SITES}
          </DropdownMenuRadioItem>
          {site.sites.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="min-h-10">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
