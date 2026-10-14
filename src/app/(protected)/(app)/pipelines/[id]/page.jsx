import { PipelineDetail } from '@/features/pipelines';

export const metadata = { title: 'Detail pipeline' };

/**
 * `/pipelines/[id]`
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function PipelineDetailPage({ params }) {
  const { id } = await params;
  return <PipelineDetail id={id} />;
}
