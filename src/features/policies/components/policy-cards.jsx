'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { formatFileSize } from '@/components/shared/file-field';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { MASTER_STATUS } from '@/lib/constants';
import { formatDate } from '@/lib/date';
import { toastApiError } from '@/lib/notify';
import { useOpenPolicyFile } from '@/features/policies/api/mutations';
import { usePolicies } from '@/features/policies/api/queries';

/** A vendor has a handful of SOPs: one request shows them all. */
const LIMIT = 100;

/**
 * `/policies` for the Worker: the vendor's active SOPs as cards (read-only, no admin table and
 * no vendor filter). "Buka" opens a fresh signed URL in a new tab.
 */
export function PolicyCards() {
  const query = usePolicies({ page: 1, limit: LIMIT, status: MASTER_STATUS.ACTIVE });
  const openFile = useOpenPolicyFile();
  const rows = (query.data?.data ?? []).filter((p) => p.status === MASTER_STATUS.ACTIVE);

  return (
    <>
      <PageHeader title="SOP" description="Prosedur kerja aman dari vendor Anda." />
      {query.isPending ? <ListSkeleton rows={4} /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada SOP aktif" />
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((policy) => (
          <li key={policy.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <FileText aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-foreground">{policy.name}</span>
              <span className="text-sm text-muted-foreground">
                {[
                  'PDF',
                  policy.file_size ? formatFileSize(policy.file_size) : null,
                  policy.updated_at ? formatDate(policy.updated_at) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-11 bg-card"
              aria-label={`Buka ${policy.name}`}
              disabled={openFile.isPending && openFile.variables === policy.id}
              onClick={() => openFile.mutate(policy.id, { onError: toastApiError })}
            >
              Buka
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
