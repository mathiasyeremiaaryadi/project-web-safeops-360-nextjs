'use client';

import { useState } from 'react';
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { ItemsList } from '@/features/items';
import { SitesList } from '@/features/sites';
import { VendorsList } from '@/features/vendors';

const TABS = Object.freeze([
  { value: 'sites', label: 'Site', createLabel: 'Tambah site', List: SitesList },
  { value: 'vendors', label: 'Vendor', createLabel: 'Tambah vendor', List: VendorsList },
  { value: 'items', label: 'Master task', createLabel: 'Tambah task', List: ItemsList },
]);

const URL_STATE = {
  tab: parseAsStringLiteral(['sites', 'vendors', 'items']).withDefault('sites'),
  q: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};

/** `/master?tab=sites|vendors|items` — Site, Vendor and Master task tabs. */
export function MasterView() {
  const [{ tab }, setUrl] = useQueryStates(URL_STATE, { history: 'replace', clearOnDefault: true });
  const [createOpen, setCreateOpen] = useState(false);
  const current = TABS.find((item) => item.value === tab) ?? TABS[0];

  return (
    <>
      <PageHeader
        title="Site & vendor"
        description="Data master PLTU/site, vendor, dan master task."
        actions={
          <Button
            type="button"
            className="h-11 px-5 text-base font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            <Plus aria-hidden="true" className="size-5" />
            {current.createLabel}
          </Button>
        }
      />
      <Tabs
        value={tab}
        // Search and page belong to one tab: reset them when switching.
        onValueChange={(value) => setUrl({ tab: /** @type {any} */ (value), q: null, page: null })}
        className="gap-4"
      >
        <TabsList variant="line" className="h-auto! w-full justify-start border-b pb-0">
          {TABS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="h-11 flex-none px-4 text-[15px] data-active:text-primary"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ value, List }) => (
          <TabsContent key={value} value={value}>
            {value === tab ? (
              <List createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
