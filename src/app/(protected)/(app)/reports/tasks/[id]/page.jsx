import { TaskReportPage } from '@/features/pipeline-reports';

export const metadata = { title: 'Detail laporan' };

/**
 * `/reports/tasks/[id]`
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function TaskReportDetailPage({ params }) {
  const { id } = await params;
  return <TaskReportPage id={id} />;
}
