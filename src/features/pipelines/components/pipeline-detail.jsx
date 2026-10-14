'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState, ListSkeleton } from '@/components/shared/list-states';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusChangeDialog } from '@/components/shared/status-change-dialog';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { can } from '@/lib/auth/permissions';
import { getErrorMessage } from '@/lib/api/errors';
import { MASTER_STATUS, MASTER_STATUS_BADGES } from '@/lib/constants';
import { useSession } from '@/features/auth';
import { useChangePipelineStatus } from '@/features/pipelines/api/mutations';
import { usePipeline } from '@/features/pipelines/api/queries';
import { PipelineFormDialog } from '@/features/pipelines/components/pipeline-form-dialog';
import { PipelineItems } from '@/features/pipelines/components/pipeline-items';

/** `/pipelines/[id]` body. @param {{ id: string }} props */
export function PipelineDetail({ id }) {
  const query = usePipeline(id);
  const { user } = useSession();
  const vendors = useOptionLabels('vendors');
  const changeStatus = useChangePipelineStatus(id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError && /** @type {any} */ (query.error).status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="Data tidak ditemukan"
        description="Pipeline ini tidak ada atau di luar akses Anda."
        action={
          <Link
            href="/pipelines"
            className={buttonVariants({ variant: 'outline', className: 'h-11 bg-card' })}
          >
            Kembali ke daftar pipeline
          </Link>
        }
      />
    );
  }
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const pipeline = query.data;
  const vendorName = vendors.labelOf(pipeline.vendor_id);
  const canEditPipeline = can(user, 'PIPELINE_WRITE');

  return (
    <>
      <PageHeader title={pipeline.name} />
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-semibold text-foreground md:sr-only">{pipeline.name}</p>
            <p className="text-sm text-muted-foreground">
              {vendorName}
              {pipeline.description ? ` · ${pipeline.description}` : ''}
            </p>
          </div>
          <StatusBadge status={MASTER_STATUS_BADGES[pipeline.status]} />
        </div>

        {canEditPipeline ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 bg-card"
              onClick={() => setEditing(true)}
            >
              Edit pipeline
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                pipeline.status === MASTER_STATUS.ACTIVE
                  ? 'h-11 bg-card text-danger hover:text-danger'
                  : 'h-11 bg-card'
              }
              onClick={() => setConfirming(true)}
            >
              {pipeline.status === MASTER_STATUS.ACTIVE ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
          </div>
        ) : null}

        <PipelineItems pipelineId={pipeline.id} canEdit={can(user, 'PIPELINE_ITEM_WRITE')} />
      </section>

      <PipelineFormDialog
        open={editing}
        pipeline={pipeline}
        vendorName={vendorName}
        onClose={() => setEditing(false)}
      />
      <StatusChangeDialog
        target={confirming ? pipeline : null}
        entityLabel="pipeline"
        pending={changeStatus.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          changeStatus.mutate(pipeline, {
            onSuccess: () => {
              toast.success('Status pipeline berhasil diubah.');
              setConfirming(false);
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
      />
    </>
  );
}
