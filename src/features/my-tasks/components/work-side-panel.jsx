'use client';

import Link from 'next/link';
import { FileText, PackageX } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatFileSize } from '@/components/shared/file-field';
import { MASTER_STATUS } from '@/lib/constants';
import { toastApiError } from '@/lib/notify';
import { useOpenPolicyFile, usePolicies } from '@/features/policies';

/** SOPs shown next to the tasks: the vendor's active SOPs (there is no task → SOP relation). */
const SOP_LIMIT = 3;

/**
 * Side panel of "Tugas hari ini" (beside the list from 1024px, below it on smaller screens):
 * the vendor's SOPs and a shortcut to report broken equipment.
 */
export function WorkSidePanel() {
  const policies = usePolicies({ page: 1, limit: SOP_LIMIT, status: MASTER_STATUS.ACTIVE });
  const openFile = useOpenPolicyFile();
  const rows = (policies.data?.data ?? []).slice(0, SOP_LIMIT);

  return (
    <aside className="flex flex-col gap-4">
      <section aria-labelledby="vendor-sop-title" className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 id="vendor-sop-title" className="mb-3 font-semibold text-foreground">
          SOP vendor
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {policies.isPending ? 'Memuat SOP…' : 'Belum ada SOP aktif.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((policy) => (
              <li key={policy.id} className="flex items-center gap-3">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {policy.name}
                  </span>
                  {policy.file_size ? (
                    <span className="text-xs text-muted-foreground">
                      PDF · {formatFileSize(policy.file_size)}
                    </span>
                  ) : null}
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
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-semibold text-foreground">Ada perlengkapan rusak?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Laporkan supaya admin vendor bisa menggantinya.
        </p>
        <Link
          href="/inventory-reports/new"
          className={buttonVariants({
            variant: 'outline',
            className: 'mt-3 h-12 w-full bg-card text-base font-semibold',
          })}
        >
          <PackageX aria-hidden="true" className="size-5" />
          Lapor inventory
        </Link>
      </section>
    </aside>
  );
}
