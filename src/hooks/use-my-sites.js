'use client';

import { useQueries } from '@tanstack/react-query';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { fetchSiteName } from '@/lib/api/lookups';

/**
 * Sites of a scoped user (Admin) as options `{ value, label }`, from the first source that
 * works:
 * 1. `GET /sites` — already filtered by the backend to the user's scope;
 * 2. the sites in `/auth/me` — names included when the backend sends them;
 * 3. `GET /sites/{id}` per site still without a name.
 * @param {{ sites?: { id: string, name?: string | null }[] } | null | undefined} user
 * @param {boolean} enabled Only for scoped users (others see every site).
 */
export function useMySites(user, enabled) {
  const list = useOptionLabels('sites');
  const fromMe = enabled ? (user?.sites ?? []) : [];
  const useFallback = enabled && !list.isLoading && list.options.length === 0;
  const unnamed = useFallback ? fromMe.filter((site) => !site.name) : [];

  const names = useQueries({
    queries: unnamed.map((site) => ({
      queryKey: ['lookups', 'sites', 'name', site.id],
      queryFn: () => fetchSiteName(site.id),
      staleTime: 5 * 60_000,
    })),
  });

  if (!enabled) return [];
  if (list.options.length > 0) return list.options;
  return fromMe.map((site) => {
    const fetched = names[unnamed.findIndex((other) => other.id === site.id)]?.data;
    return { value: site.id, label: site.name ?? fetched ?? `Site ${site.id}` };
  });
}
