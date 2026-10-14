import { TaskReportsList } from '@/features/pipeline-reports';

export const metadata = { title: 'Review laporan' };

/** `/reports/tasks` */
export default function TaskReportsPage() {
  return <TaskReportsList />;
}
