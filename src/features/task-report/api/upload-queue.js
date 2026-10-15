'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { myTaskKeys } from '@/features/my-tasks';
import {
  listPendingUploads,
  processUploadQueue,
  resetUploadAttempts,
  subscribeUploadQueue,
} from '@/features/offline';
import { taskReportKeys } from '@/features/pipeline-reports';
import { uploadEvidence } from '@/features/task-report/api/report-api';

/** @param {string} userId */
export const uploadQueueKey = (userId) => ['offline-uploads', userId];

/**
 * The signed-in worker's queued photos, and `process()` to send them (when the app opens, the
 * device comes online, or a report page opens). After a photo is sent the report reloads.
 */
export function useUploadQueue() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: uploadQueueKey(userId),
    queryFn: () => listPendingUploads(userId),
    enabled: Boolean(userId),
    // Read from IndexedDB: also while offline.
    networkMode: 'always',
  });

  useEffect(
    () =>
      subscribeUploadQueue(() =>
        queryClient.invalidateQueries({ queryKey: uploadQueueKey(userId) }),
      ),
    [queryClient, userId],
  );

  const process = useCallback(async () => {
    if (!userId || !navigator.onLine) return;
    const sent = await processUploadQueue(userId, (upload) =>
      uploadEvidence({ reportId: upload.reportId, type: upload.type, file: upload.blob }),
    );
    if (sent.length === 0) return;
    queryClient.invalidateQueries({ queryKey: taskReportKeys.all });
    queryClient.invalidateQueries({ queryKey: myTaskKeys.all });
  }, [queryClient, userId]);

  /** "Coba lagi" after 5 failures. @param {number} id */
  const retry = async (id) => {
    await resetUploadAttempts(id);
    await process();
  };

  return { uploads: query.data ?? [], process, retry };
}
