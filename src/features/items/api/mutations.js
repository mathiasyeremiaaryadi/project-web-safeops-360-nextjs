'use client';

import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { useSaveMutation } from '@/hooks/use-resource';
import { lookupKey } from '@/lib/api/query-keys';
import { itemKeys } from '@/features/items/api/keys';

/** Create (`POST /items`) or update (`PATCH /items/{id}`) a master task: `mutate({ id?, body })`. */
export const useSaveItem = () =>
  useSaveMutation({ path: 'v1/items', keys: itemKeys, alsoInvalidate: [lookupKey('items')] });

/** Deactivate (`DELETE`) / reactivate (`PATCH { status: ACTIVE }`) a master task. */
export const useChangeItemStatus = () =>
  useMasterStatusChange({ path: 'items', invalidate: [itemKeys.lists(), lookupKey('items')] });
