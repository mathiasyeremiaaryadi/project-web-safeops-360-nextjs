import { MyReportsView } from '@/features/task-report';

export const metadata = { title: 'Riwayat laporan' };

/** `/history` — the Worker's own task reports. */
export default function HistoryPage() {
  return <MyReportsView />;
}
