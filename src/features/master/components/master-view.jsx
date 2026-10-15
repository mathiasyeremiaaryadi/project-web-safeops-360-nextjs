'use client';

import { useState } from 'react';
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { can } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';
import { ItemsList } from '@/features/items';
import { SitesList } from '@/features/sites';
import { VendorsList } from '@/features/vendors';

/**
 * `read`: permission needed to see the tab (the Site tab is only for users who see every site);
 * `write`: permission needed to add/edit/deactivate in the tab (others only read).
 */
const TABS = Object.freeze([
  {
    value: 'sites',
    label: 'Site',
    createLabel: 'Tambah site',
    read: 'ALL_SITES_READ',
    write: 'SITE_VENDOR_WRITE',
    List: SitesList,
  },
  {
    value: 'vendors',
    label: 'Vendor',
    createLabel: 'Tambah vendor',
    read: 'SITE_VENDOR_READ',
    write: 'SITE_VENDOR_WRITE',
    List: VendorsList,
  },
  {
    value: 'items',
    label: 'Master task',
    createLabel: 'Tambah task',
    read: 'SITE_VENDOR_READ',
    write: 'ITEM_WRITE',
    List: ItemsList,
  },
]);

const URL_STATE = {
  tab: parseAsStringLiteral(['sites', 'vendors', 'items']).withDefault('sites'),
  q: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

/**
 * `/master?tab=sites|vendors|items` — "Site & vendor" (Super Admin: Site, Vendor, Master task) or
 * "Vendor" (Admin: Vendor and Master task of their sites, read only).
 */
export function MasterView() {
  const [{ tab }, setUrl] = useQueryStates(URL_STATE, { history: 'replace', clearOnDefault: true });
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useSession();
  const allSites = can(user, 'ALL_SITES_READ');
  const tabs = TABS.filter((item) => can(user, /** @type {any} */ (item.read)));
  const current = tabs.find((item) => item.value === tab) ?? tabs[0];
  const canEdit = can(user, /** @type {any} */ (current.write));

  return (
    <>
      <PageHeader
        title={allSites ? 'Site & vendor' : 'Vendor'}
        description={
          allSites
            ? 'Data master PLTU/site, vendor, dan master task.'
            : 'Vendor yang bekerja di site Anda dan master task yang dipakai.'
        }
        actions={
          canEdit ? (
            <Button
              type="button"
              className="h-11 px-5 text-base font-semibold"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden="true" className="size-5" />
              {current.createLabel}
            </Button>
          ) : null
        }
      />
      <Tabs
        value={current.value}
        // Search and page belong to one tab: reset them when switching.
        onValueChange={(value) => setUrl({ tab: /** @type {any} */ (value), q: null, page: null })}
        className="gap-4"
      >
        <TabsList variant="line" className="h-auto! w-full justify-start border-b pb-0">
          {tabs.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="h-11 flex-none px-4 text-[15px] text-muted-foreground data-active:text-primary"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(({ value, List }) => (
          <TabsContent key={value} value={value}>
            {value === current.value ? (
              <List
                canEdit={canEdit}
                createOpen={createOpen}
                onCreateClose={() => setCreateOpen(false)}
              />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
