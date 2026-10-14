import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';

/**
 * Placeholder for a page that is not built yet.
 * @param {{ title: string }} props
 */
export function ComingSoon({ title }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Segera hadir"
        description="Halaman ini sedang disiapkan."
      />
    </>
  );
}
