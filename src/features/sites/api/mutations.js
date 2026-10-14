'use client';

import { useMasterStatusChange } from '@/hooks/use-master-status-change';
import { useSaveMutation } from '@/hooks/use-resource';
import { lookupKey } from '@/lib/api/query-keys';
import { siteKeys } from '@/features/sites/api/keys';

/** Create (`POST /sites`) or update (`PATCH /sites/{id}`) a site: `mutate({ id?, body })`. */
export const useSaveSite = () =>
  useSaveMutation({ path: 'v1/sites', keys: siteKeys, alsoInvalidate: [lookupKey('sites')] });

/** Deactivate (`DELETE`) / reactivate (`PATCH { status: ACTIVE }`) a site. */
export const useChangeSiteStatus = () =>
  useMasterStatusChange({ path: 'sites', invalidate: [siteKeys.lists(), lookupKey('sites')] });
