import { PipelinesList } from '@/features/pipelines';

export const metadata = { title: 'Pipeline & task' };

/** `/pipelines` */
export default function PipelinesPage() {
  return <PipelinesList />;
}
