import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '@/features/auth/stores/session-store';

const admin = { id: 'a1', username: 'andi', roles: ['ADMIN'] };
const other = { id: 'a2', username: 'budi', roles: ['ADMIN'] };

describe('session store — active site', () => {
  beforeEach(() => useSessionStore.getState().clear());

  it('starts with "all of my sites" and keeps the choice while the same user is refreshed', () => {
    const store = useSessionStore.getState();
    store.setUser(admin);
    expect(useSessionStore.getState().activeSiteId).toBeNull();
    store.setActiveSiteId('s3');
    store.setUser({ ...admin, full_name: 'Andi' });
    expect(useSessionStore.getState().activeSiteId).toBe('s3');
  });

  it('resets on logout (clear)', () => {
    const store = useSessionStore.getState();
    store.setUser(admin);
    store.setActiveSiteId('s3');
    store.clear();
    expect(useSessionStore.getState()).toMatchObject({ user: null, activeSiteId: null });
  });

  it('resets when another account signs in', () => {
    const store = useSessionStore.getState();
    store.setUser(admin);
    store.setActiveSiteId('s3');
    store.setUser(other);
    expect(useSessionStore.getState().activeSiteId).toBeNull();
  });
});
