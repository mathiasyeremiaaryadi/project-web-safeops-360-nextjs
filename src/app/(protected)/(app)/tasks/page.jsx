import { TasksView } from '@/features/my-tasks';

export const metadata = { title: 'Tugas hari ini' };

/** `/tasks` — the Worker's home page. */
export default function TasksPage() {
  return <TasksView />;
}
