import { PipelineProgressList } from '@/features/vendor-progress';

export const metadata = { title: 'Progress pipeline' };

/** `/pipeline-progress` — the Admin vendor's task progress per pipeline. */
export default function PipelineProgressPage() {
  return <PipelineProgressList />;
}
