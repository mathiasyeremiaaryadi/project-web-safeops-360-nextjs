import { PageHeader } from '@/components/layout/page-header';
import { AuditLogsList } from '@/features/audit-logs';

export const metadata = { title: 'Audit log' };

/** `/audit-logs` */
export default function AuditLogsPage() {
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Catatan login dan perubahan akses. Hanya bisa dibaca, tidak bisa diubah atau dihapus."
      />
      <AuditLogsList />
    </>
  );
}
