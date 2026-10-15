'use client';

import { useSyncExternalStore } from 'react';

/** @param {() => void} onChange */
function subscribe(onChange) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Whether the device has a network connection (`navigator.onLine` + `online`/`offline` events).
 * Assumed online while rendering on the server.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
