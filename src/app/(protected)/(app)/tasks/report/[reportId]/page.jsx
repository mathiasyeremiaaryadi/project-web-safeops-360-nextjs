import { TaskReportView } from '@/features/task-report';

export const metadata = { title: 'Laporan task' };

/**
 * `/tasks/report/[reportId]`
 * @param {{ params: Promise<{ reportId: string }> }} props
 */
export default async function TaskReportPage({ params }) {
  const { reportId } = await params;
  return <TaskReportView reportId={reportId} />;
}
