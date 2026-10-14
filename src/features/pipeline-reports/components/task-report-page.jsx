'use client';

import { TaskReportDetail } from '@/features/pipeline-reports/components/task-report-detail';

/** `/reports/tasks/[id]` body. @param {{ id: string }} props */
export function TaskReportPage({ id }) {
  return <TaskReportDetail id={id} variant="page" />;
}
