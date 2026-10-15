'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { myTaskKeys } from '@/features/my-tasks';
import { persistUserQueries } from '@/features/offline';
import { useUploadQueue } from '@/features/task-report/api/upload-queue';

/**
 * Mounted once in the app shell for a Worker (prompt section 7): keeps today's tasks readable
 * offline, and sends queued photos when the app opens and whenever the device comes online.
 */
export function WorkerOfflineSync() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const { process } = useUploadQueue();

  useEffect(() => {
    if (!userId) return undefined;
    return persistUserQueries(queryClient, userId, (key) => key[0] === myTaskKeys.all[0]);
  }, [queryClient, userId]);

  useEffect(() => {
    process();
    window.addEventListener('online', process);
    return () => window.removeEventListener('online', process);
  }, [process]);

  return null;
}
