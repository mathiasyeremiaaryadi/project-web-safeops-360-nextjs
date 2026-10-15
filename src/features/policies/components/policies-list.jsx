'use client';

import { useState } from 'react';
import { parseAsString } from 'nuqs';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { formatFileSize } from '@/components/shared/file-field';
import { FilterBar } from '@/components/shared/filter-bar';
import { LookupFilter } from '@/components/shared/lookup-filter';
import { QueryList } from '@/components/shared/query-list';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useListParams } from '@/hooks/use-list-params';
import { useSiteContext } from '@/hooks/use-site-context';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { formatDate } from '@/lib/date';
import { toastApiError } from '@/lib/notify';
import { filterRows, searchRows } from '@/lib/search';
import { MASTER_STATUS_BADGES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { useChangePolicyStatus, useOpenPolicyFile } from '@/features/policies/api/mutations';
import { usePolicies } from '@/features/policies/api/queries';
import { PolicyActions } from '@/features/policies/components/policy-actions';
import { PolicyFormDialog } from '@/features/policies/components/policy-form-dialog';

/** @typedef {import('@/features/policies/api/schemas').Policy} Policy */

const FILTERS = { vendor_id: parseAsString.withDefault('') };

/** "1,2 MB", "14 Okt 2026" — whichever is available. @param {Policy} policy */
const fileParts = (policy) =>
  [
    policy.file_size ? formatFileSize(policy.file_size) : null,
    policy.updated_at ? formatDate(policy.updated_at) : null,
  ].filter(Boolean);

/** `/policies` — SOP list, "Buka" (signed URL in a new tab), upload and edit. */
export function PoliciesList() {
  const { user } = useSession();
  const canEdit = can(user, 'INVENTORY_POLICY_WRITE');
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const site = useSiteContext();
  const siteId = site.siteIdFor();
  const query = usePolicies({ ...params, site_id: siteId, limit });
  const vendors = useOptionLabels('vendors');
  const openFile = useOpenPolicyFile();
  const changeStatus = useChangePolicyStatus();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(/** @type {Policy | null} */ (null));
  const [toggling, setToggling] = useState(/** @type {Policy | null} */ (null));
  const rows = query.data
    ? searchRows(filterRows(query.data.data, { vendor_id: params.vendor_id }), params.q, (p) => [
        p.name,
        vendors.labelOf(p.vendor_id),
      ])
    : [];

  /** @param {Policy} policy */
  const actions = (policy) => (
    <PolicyActions
      policy={policy}
      canEdit={canEdit}
      opening={openFile.isPending && openFile.variables === policy.id}
      onOpen={() => openFile.mutate(policy.id, { onError: toastApiError })}
      onEdit={() => setEditing(policy)}
      onToggleStatus={() => setToggling(policy)}
    />
  );
  const badge = (/** @type {Policy} */ p) => (
    <StatusBadge status={MASTER_STATUS_BADGES[p.status]} />
  );

  const columns = [
    {
      id: 'name',
      header: 'Nama SOP',
      meta: { sortValue: (/** @type {Policy} */ p) => p.name },
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      id: 'vendor',
      header: 'Vendor',
      meta: { sortValue: (/** @type {Policy} */ p) => vendors.labelOf(p.vendor_id) },
      cell: ({ row }) => vendors.labelOf(row.original.vendor_id),
    },
    {
      id: 'file',
      header: 'File',
      meta: { hideBelow: 'lg', sortValue: (/** @type {Policy} */ p) => p.updated_at },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{fileParts(row.original).join(' · ') || '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { sortValue: (/** @type {Policy} */ p) => p.status },
      cell: ({ row }) => badge(row.original),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => actions(row.original),
    },
  ];

  return (
    <>
      <PageHeader
        title="SOP"
        description="Dokumen SOP (PDF) tiap vendor."
        actions={
          canEdit ? (
            <Button
              type="button"
              className="h-11 px-5 text-base font-semibold"
              onClick={() => setCreating(true)}
            >
              <Upload aria-hidden="true" className="size-5" />
              Upload SOP
            </Button>
          ) : null
        }
      />

      <FilterBar
        className="mb-3"
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari nama SOP atau vendor"
      />
      {site.showVendorFilter ? (
        <LookupFilter
          className="mb-4 sm:max-w-80"
          lookup="vendors"
          params={siteId ? { site_id: siteId } : undefined}
          value={params.vendor_id}
          onChange={(vendor_id) => setFilters({ vendor_id })}
          placeholder="Semua vendor"
          ariaLabel="Filter vendor"
        />
      ) : null}

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: FileText,
          title: 'Belum ada SOP',
          description: 'Ubah filter, atau upload SOP baru.',
        }}
        noun="SOP"
        onPageChange={setPage}
        columns={columns}
        getRowId={(p) => p.id}
        caption="Daftar SOP"
        cardGridClassName="sm:grid-cols-2"
        renderCard={(p) => (
          <article className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground">{p.name}</p>
              {badge(p)}
            </div>
            <p className="text-sm text-muted-foreground">
              {[vendors.labelOf(p.vendor_id), ...fileParts(p)].join(' · ')}
            </p>
            {actions(p)}
          </article>
        )}
      />

      <PolicyFormDialog
        open={creating || Boolean(editing)}
        policy={editing}
        vendorName={editing ? vendors.labelOf(editing.vendor_id) : ''}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
      <StatusChangeDialog
        target={toggling}
        entityLabel="SOP"
        mutation={changeStatus}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
