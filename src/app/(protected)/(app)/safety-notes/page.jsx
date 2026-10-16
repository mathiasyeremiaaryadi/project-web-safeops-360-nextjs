import { SafetyNotesList } from '@/features/pipeline-reports';

export const metadata = { title: 'Catatan safety' };

/** `/safety-notes` */
export default function SafetyNotesPage() {
  return <SafetyNotesList />;
}
